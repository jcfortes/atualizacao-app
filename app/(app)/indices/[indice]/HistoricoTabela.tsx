'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { INDICE_LABEL, type Indice, type TipoIndice } from '@/lib/indices'
import { gerarExcelHistorico } from '@/lib/exportHistorico'
import { Grafico } from './Grafico'

const BotaoExportarPDFHistorico = dynamic(
  () => import('./HistoricoPDF').then((m) => m.BotaoExportarPDFHistorico),
  { ssr: false }
)

interface Dado {
  data: string
  valor: string
}

interface DadoEnriquecido extends Dado {
  variacaoMes: number | null
  acumuladoAno: number | null
  acumulado12m: number | null
}

interface Resposta {
  indice: Indice
  label: string
  tipo: TipoIndice
  total: number
  dados: Dado[]
}

// ── Helpers de formatação ──────────────────────────────────────────────────

function formatarValor(valor: string, tipo: TipoIndice, comSimbolo = false): string {
  const num = parseFloat(valor.replace(',', '.'))
  if (isNaN(num)) return valor
  if (tipo === 'valor_absoluto') {
    return num.toLocaleString('pt-BR', {
      ...(comSimbolo ? { style: 'currency', currency: 'BRL' } : {}),
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }
  return `${num.toFixed(4).replace('.', ',')}%`
}

function formatarPct(v: number | null): string {
  if (v === null) return '—'
  const sinal = v > 0 ? '+' : ''
  return `${sinal}${v.toFixed(2).replace('.', ',')}%`
}

function corValorPrincipal(valor: string, tipo: TipoIndice): string {
  if (tipo === 'valor_absoluto') return 'text-gray-900 font-semibold'
  const num = parseFloat(valor.replace(',', '.'))
  if (num > 0) return 'text-emerald-700 font-semibold'
  if (num < 0) return 'text-red-600 font-semibold'
  return 'text-gray-500'
}

function corVariacao(v: number | null): string {
  if (v === null) return 'text-gray-300'
  if (v > 0) return 'text-emerald-700'
  if (v < 0) return 'text-red-600'
  return 'text-gray-500'
}

// ── Enriquecimento dos dados ───────────────────────────────────────────────
// Recebe a série COMPLETA (do mais recente pro mais antigo) e calcula
// variação vs mês anterior e acumulado em 12 meses para cada linha.

// Extrai o ano do formato "DD/MM/YYYY"
function anoDe(data: string): string {
  return data.split('/')[2] ?? ''
}

function enriquecer(dados: Dado[], tipo: TipoIndice): DadoEnriquecido[] {
  return dados.map((d, i) => {
    const atualNum = parseFloat(d.valor.replace(',', '.'))
    const anoAtual = anoDe(d.data)
    let variacaoMes: number | null = null
    let acumuladoAno: number | null = null
    let acumulado12m: number | null = null

    if (tipo === 'valor_absoluto') {
      // Variação % vs mês anterior
      const anterior = dados[i + 1]
      if (anterior) {
        const antNum = parseFloat(anterior.valor.replace(',', '.'))
        if (antNum) variacaoMes = (atualNum / antNum - 1) * 100
      }
      // Acumulado no ano: razão entre valor atual e o de dezembro do ano anterior
      let j = i + 1
      while (j < dados.length && anoDe(dados[j].data) === anoAtual) j++
      const dezembroAnterior = dados[j] // primeira linha com ano diferente = dezembro do ano anterior
      if (dezembroAnterior) {
        const baseNum = parseFloat(dezembroAnterior.valor.replace(',', '.'))
        if (baseNum) acumuladoAno = (atualNum / baseNum - 1) * 100
      }
      // Acumulado 12m: razão entre valor atual e o de 12 meses atrás
      const refDoze = dados[i + 12]
      if (refDoze) {
        const refNum = parseFloat(refDoze.valor.replace(',', '.'))
        if (refNum) acumulado12m = (atualNum / refNum - 1) * 100
      }
    } else {
      // taxa_mensal: variação mês = a própria taxa (não faz sentido coluna separada)
      variacaoMes = atualNum
      // Acumulado no ano: produto das taxas mensais do ano corrente até o mês atual
      let fatorAno = 1
      let j = i
      while (j < dados.length && anoDe(dados[j].data) === anoAtual) {
        const tx = parseFloat(dados[j].valor.replace(',', '.')) / 100
        fatorAno *= 1 + tx
        j++
      }
      acumuladoAno = (fatorAno - 1) * 100
      // Acumulado 12m: produto das taxas dos últimos 12 meses (incluindo o atual)
      if (i + 12 <= dados.length) {
        let fator = 1
        for (let j = i; j < i + 12; j++) {
          const tx = parseFloat(dados[j].valor.replace(',', '.')) / 100
          fator *= 1 + tx
        }
        acumulado12m = (fator - 1) * 100
      }
    }

    return { ...d, variacaoMes, acumuladoAno, acumulado12m }
  })
}

// ── Componente ─────────────────────────────────────────────────────────────

export function HistoricoTabela({
  indice,
  tipo,
  endpoint,
  labelCustom,
}: {
  indice: Indice | string
  tipo: TipoIndice
  endpoint?: string
  labelCustom?: string
}) {
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [exportando, setExportando] = useState(false)

  const urlFetch = endpoint ?? `/api/serie/${indice}`

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    setErro('')
    setResposta(null)
    fetch(urlFetch)
      .then(async (r) => {
        if (cancelado) return
        // Lê como texto antes de tentar JSON pra evitar SyntaxError críptico
        const texto = await r.text()
        if (cancelado) return
        if (!texto.trim().startsWith('{') && !texto.trim().startsWith('[')) {
          throw new Error(`Resposta inválida do servidor (${r.status}). Recarregue a página em alguns segundos.`)
        }
        let data: { error?: string } & Resposta
        try {
          data = JSON.parse(texto)
        } catch {
          throw new Error('Resposta corrompida do servidor. Recarregue a página.')
        }
        if (data.error) throw new Error(data.error)
        if (!cancelado) setResposta(data)
      })
      .catch((e) => {
        if (!cancelado) setErro(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [urlFetch])

  // Enriquece dados com as colunas calculadas (uma vez só)
  const dadosEnriquecidos = useMemo(
    () => (resposta ? enriquecer(resposta.dados, tipo) : []),
    [resposta, tipo]
  )

  // KPIs do registro mais recente
  const ultimo = dadosEnriquecidos[0]

  // Aplica busca (filtra após enriquecer pra cálculo permanecer correto)
  const dadosFiltrados = useMemo(
    () => (busca ? dadosEnriquecidos.filter((d) => d.data.includes(busca)) : dadosEnriquecidos),
    [busca, dadosEnriquecidos]
  )

  async function exportarExcel() {
    if (!resposta) return
    setExportando(true)
    try {
      const blob = await gerarExcelHistorico(indice, tipo, dadosEnriquecidos, labelCustom)
      const nomeArquivo = labelCustom
        ? `Historico_Cesta_${labelCustom.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `Historico_${indice}_${new Date().toISOString().slice(0, 10)}.xlsx`
      const nome = nomeArquivo
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Carregando série histórica do BCB...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-sm text-red-700">{erro}</p>
      </div>
    )
  }

  if (!resposta || !ultimo) return null

  const isAbsoluto = tipo === 'valor_absoluto'

  return (
    <div className="space-y-4">
      {/* KPIs — destacando o registro mais recente */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Último registro ({ultimo.data})</p>
          <p className="font-bold text-gray-900">{formatarValor(ultimo.valor, tipo, true)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">{isAbsoluto ? 'Variação no mês' : 'Taxa do mês'}</p>
          <p className={`font-bold ${corVariacao(ultimo.variacaoMes)}`}>{formatarPct(ultimo.variacaoMes)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Acumulado no ano ({anoDe(ultimo.data)})</p>
          <p className={`font-bold ${corVariacao(ultimo.acumuladoAno)}`}>{formatarPct(ultimo.acumuladoAno)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Acumulado 12 meses</p>
          <p className={`font-bold ${corVariacao(ultimo.acumulado12m)}`}>{formatarPct(ultimo.acumulado12m)}</p>
        </div>
      </div>

      {/* Gráfico de evolução */}
      <Grafico dados={resposta.dados} tipo={tipo} />

      {/* Busca */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtrar por mês ou ano (ex: 2024, 03/2023)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <span className="text-xs text-gray-400 hidden sm:block">
          {dadosFiltrados.length.toLocaleString('pt-BR')} de {resposta.total.toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Tabela com scroll */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-gray-900">Série histórica completa</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Do mais recente ao mais antigo · {labelCustom ?? INDICE_LABEL[indice as Indice]}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              <span>📊</span>
              {exportando ? 'Gerando...' : 'Exportar Excel'}
            </button>
            <BotaoExportarPDFHistorico indice={indice} tipo={tipo} dados={dadosEnriquecidos} labelCustom={labelCustom} />
          </div>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-900 text-white">
                <th className="px-6 py-3 text-left font-semibold">Data</th>
                <th className="px-6 py-3 text-right font-semibold">
                  {isAbsoluto ? 'Cotação (R$)' : 'Taxa (% a.m.)'}
                </th>
                {isAbsoluto && (
                  <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Var. mês</th>
                )}
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Acum. ano</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Acum. 12m</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={isAbsoluto ? 5 : 4} className="px-6 py-10 text-center text-sm text-gray-400">
                    Nenhum registro encontrado para "{busca}"
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((d, i) => (
                  <tr
                    key={`${d.data}-${i}`}
                    className={`border-t border-gray-100 hover:bg-emerald-50/40 transition-colors ${
                      i % 2 === 0 ? 'bg-gray-50/40' : ''
                    }`}
                  >
                    <td className="px-6 py-2.5 text-gray-700 font-medium">{d.data}</td>
                    <td className={`px-6 py-2.5 text-right font-mono ${corValorPrincipal(d.valor, tipo)}`}>
                      {formatarValor(d.valor, tipo)}
                    </td>
                    {isAbsoluto && (
                      <td className={`px-4 py-2.5 text-right font-mono ${corVariacao(d.variacaoMes)}`}>
                        {formatarPct(d.variacaoMes)}
                      </td>
                    )}
                    <td className={`px-4 py-2.5 text-right font-mono ${corVariacao(d.acumuladoAno)}`}>
                      {formatarPct(d.acumuladoAno)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono ${corVariacao(d.acumulado12m)}`}>
                      {formatarPct(d.acumulado12m)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Fonte:{' '}
        <a
          href="https://www3.bcb.gov.br/sgspub/"
          target="_blank"
          rel="noopener"
          className="hover:text-emerald-600 underline"
        >
          BCB / Sistema Gerenciador de Séries Temporais (SGS)
        </a>
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { INDICE_LABEL, type Indice } from '@/lib/indices'

const BotaoExportarPDF = dynamic(
  () => import('./LaudoPDF').then((m) => m.BotaoExportarPDF),
  { ssr: false }
)

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(4).replace('.', ',')}%`
}

function fmtFator(v: number) {
  return v.toFixed(6).replace('.', ',')
}

interface Resultado {
  valor_original: number
  valor_corrigido: number
  fator: number
  variacao_pct: number
  periodos: number
  dados: { data: string; valor: string }[]
}

function CurrencyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(''); return }
    const num = parseInt(digits, 10) / 100
    onChange(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="0,00"
      value={value}
      onChange={handleChange}
      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
    />
  )
}

export function Calculadora() {
  const [valor, setValor] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [indice, setIndice] = useState<Indice>('IPCA')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  function mesParaBCB(mes: string, ultimo = false) {
    if (!mes) return ''
    const [ano, m] = mes.split('-')
    if (ultimo) {
      const ultimoDia = new Date(parseInt(ano), parseInt(m), 0).getDate()
      return `${String(ultimoDia).padStart(2, '0')}/${m}/${ano}`
    }
    return `01/${m}/${ano}`
  }

  async function calcular() {
    const num = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (!num || !inicio || !fim) { setErro('Preencha todos os campos.'); return }
    if (inicio >= fim) { setErro('A data de início deve ser anterior à data final.'); return }
    setErro('')
    setLoading(true)
    setResultado(null)
    try {
      const params = new URLSearchParams({
        valor: String(num),
        inicio: mesParaBCB(inicio),
        fim: mesParaBCB(fim, true),
        indice,
      })
      const res = await fetch(`/api/corrigir?${params}`)
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      setResultado(data)
    } catch {
      setErro('Erro ao conectar com a API. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const indices = Object.entries(INDICE_LABEL) as [Indice, string][]

  // Pré-calcula a série com fator acumulado e valor corrigido
  function calcularSerie() {
    if (!resultado) return []
    let fatorAcum = 1
    return resultado.dados.map((d) => {
      const taxa = parseFloat(d.valor.replace(',', '.'))
      const fatorMensal = 1 + taxa / 100
      fatorAcum = fatorAcum * fatorMensal
      return { mes: d.data, taxa, fatorMensal, fatorAcum, valorCorrigido: resultado.valor_original * fatorAcum }
    })
  }

  const serie = calcularSerie()

  return (
    <div className="space-y-6">

      {/* ── Topo: formulário + resultado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">Dados do Cálculo</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Índice de correção</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {indices.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setIndice(key)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    indice === key
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{INDICE_LABEL[indice]}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor original (R$)</label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mês inicial</label>
              <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mês final</label>
              <input type="month" value={fim} onChange={(e) => setFim(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm" />
            </div>
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>
          )}

          <button
            onClick={calcular}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? 'Calculando...' : 'Calcular correção →'}
          </button>
        </div>

        {/* Resultado */}
        <div>
          {!resultado && !loading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex items-center justify-center h-full text-gray-400 text-sm text-center">
              Preencha os dados ao lado e clique em Calcular
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Consultando {indice} no Banco Central...</p>
              </div>
            </div>
          )}

          {resultado && (
            <div className="space-y-4 h-full flex flex-col">
              {/* Valor corrigido */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-6">
                <p className="text-sm text-emerald-700 font-semibold mb-1">Valor corrigido</p>
                <p className="text-4xl font-black text-emerald-800">{moeda(resultado.valor_corrigido)}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Variação: <strong>{pct(resultado.variacao_pct)}</strong> · Fator: <strong>{fmtFator(resultado.fator)}</strong>
                </p>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Valor Original</p>
                  <p className="font-bold text-gray-900">{moeda(resultado.valor_original)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Diferença</p>
                  <p className="font-bold text-emerald-700">{moeda(resultado.valor_corrigido - resultado.valor_original)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Índice</p>
                  <p className="font-bold text-gray-900">{indice}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Períodos</p>
                  <p className="font-bold text-gray-900">{resultado.periodos} meses</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Planilha de atualização em largura total ── */}
      {resultado && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Planilha de atualização — {indice}</p>
              <p className="text-xs text-gray-400 mt-0.5">{resultado.periodos} meses · {INDICE_LABEL[indice]}</p>
            </div>
            <BotaoExportarPDF resultado={resultado} indice={indice} inicio={inicio} fim={fim} />
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-900 text-white">
                  <th className="px-6 py-3 text-left font-semibold">Mês</th>
                  <th className="px-6 py-3 text-right font-semibold">Taxa (%)</th>
                  <th className="px-6 py-3 text-right font-semibold">Fator Mensal</th>
                  <th className="px-6 py-3 text-right font-semibold">Fator Acumulado</th>
                  <th className="px-6 py-3 text-right font-semibold">Valor Corrigido</th>
                </tr>
              </thead>
              <tbody>
                {/* Linha zero — valor original */}
                <tr className="bg-blue-50/60 border-t border-blue-100">
                  <td className="px-6 py-3 font-semibold text-blue-800">Valor original (base)</td>
                  <td className="px-6 py-3 text-right font-mono text-gray-400">—</td>
                  <td className="px-6 py-3 text-right font-mono text-gray-400">1,000000</td>
                  <td className="px-6 py-3 text-right font-mono text-gray-400">1,000000</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-blue-700">
                    {moeda(resultado.valor_original)}
                  </td>
                </tr>
                {serie.map((linha, i) => (
                  <tr key={i} className={`border-t border-gray-100 hover:bg-emerald-50/40 transition-colors ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-6 py-3 text-gray-700 font-medium">{linha.mes}</td>
                    <td className={`px-6 py-3 text-right font-mono font-semibold ${linha.taxa >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {linha.taxa.toFixed(4).replace('.', ',')}%
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-500">
                      {linha.fatorMensal.toFixed(6).replace('.', ',')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-gray-800">
                      {linha.fatorAcum.toFixed(6).replace('.', ',')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-emerald-700">
                      {moeda(linha.valorCorrigido)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Linha de totais */}
              <tfoot>
                <tr className="bg-gray-900 text-white border-t-2 border-gray-700">
                  <td className="px-6 py-3 font-bold">{resultado.periodos} meses</td>
                  <td className="px-6 py-3 text-right font-mono font-bold">{pct(resultado.variacao_pct)}</td>
                  <td className="px-6 py-3 text-right font-mono text-gray-400">—</td>
                  <td className="px-6 py-3 text-right font-mono font-bold">{fmtFator(resultado.fator)}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold text-emerald-400">{moeda(resultado.valor_corrigido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

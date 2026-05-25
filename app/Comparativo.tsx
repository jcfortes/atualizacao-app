'use client'

import { useState } from 'react'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(4).replace('.', ',')}%`
}

function fmtFator(v: number) {
  return v.toFixed(6).replace('.', ',')
}

interface ResultadoIndice {
  indice: string
  label: string
  fator?: number
  valorCorrigido?: number
  variacao?: number
  periodos?: number
  erro?: string
}

interface ResultadoComparativo {
  valor_original: number
  resultados: ResultadoIndice[]
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

// Cores por índice
const COR: Record<string, { bg: string; borda: string; texto: string; badge: string }> = {
  IPCA:  { bg: 'bg-emerald-50',  borda: 'border-emerald-200', texto: 'text-emerald-800', badge: 'bg-emerald-600' },
  IGPM:  { bg: 'bg-blue-50',     borda: 'border-blue-200',    texto: 'text-blue-800',    badge: 'bg-blue-600' },
  INPC:  { bg: 'bg-purple-50',   borda: 'border-purple-200',  texto: 'text-purple-800',  badge: 'bg-purple-600' },
  CDI:   { bg: 'bg-orange-50',   borda: 'border-orange-200',  texto: 'text-orange-800',  badge: 'bg-orange-500' },
  SELIC: { bg: 'bg-rose-50',     borda: 'border-rose-200',    texto: 'text-rose-800',    badge: 'bg-rose-600' },
}

export function Comparativo() {
  const [valor, setValor] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [resultado, setResultado] = useState<ResultadoComparativo | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{ minMeses: number; indicesIncompletos: string[] } | null>(null)

  function mesParaBCB(mes: string, ultimo = false) {
    if (!mes) return ''
    const [ano, m] = mes.split('-')
    if (ultimo) {
      const ultimoDia = new Date(parseInt(ano), parseInt(m), 0).getDate()
      return `${String(ultimoDia).padStart(2, '0')}/${m}/${ano}`
    }
    return `01/${m}/${ano}`
  }

  // Converte quantidade de meses a partir do início para uma data YYYY-MM
  function mesesParaFim(meses: number): string {
    const [ai, mi] = inicio.split('-').map(Number)
    const totalMes = (ai * 12 + mi - 1) + (meses - 1)
    const novoAno = Math.floor(totalMes / 12)
    const novoMes = (totalMes % 12) + 1
    return `${novoAno}-${String(novoMes).padStart(2, '0')}`
  }

  async function buscar(fimOverride?: string) {
    const num = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (!num || !inicio || !fim) { setErro('Preencha todos os campos.'); return }
    if (inicio >= fim) { setErro('A data de início deve ser anterior à data final.'); return }
    setErro('')
    setAviso(null)
    setLoading(true)
    setResultado(null)
    try {
      const fimUsado = fimOverride ?? fim
      const params = new URLSearchParams({
        valor: String(num),
        inicio: mesParaBCB(inicio),
        fim: mesParaBCB(fimUsado, true),
      })
      const res = await fetch(`/api/comparar?${params}`)
      const data: ResultadoComparativo = await res.json()
      if ((data as any).error) { setErro((data as any).error); return }

      // Detecta se algum índice tem menos dados que outros
      const periodos = data.resultados.filter(r => !r.erro).map(r => r.periodos ?? 0)
      const minMeses = Math.min(...periodos)
      const maxMeses = Math.max(...periodos)

      if (minMeses < maxMeses && !fimOverride) {
        // Há índices com dados incompletos — mostra aviso antes de exibir
        const incompletos = data.resultados
          .filter(r => !r.erro && (r.periodos ?? 0) < maxMeses)
          .map(r => r.indice)
        setAviso({ minMeses, indicesIncompletos: incompletos })
        setResultado(data)
      } else {
        setResultado(data)
      }
    } catch {
      setErro('Erro ao conectar com a API. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function recalcularComMesesDisponiveis() {
    if (!aviso) return
    const novoFim = mesesParaFim(aviso.minMeses)
    setAviso(null)
    await buscar(novoFim)
  }

  // Ordena pelo maior valor corrigido
  const ordenados = resultado
    ? [...resultado.resultados].sort((a, b) => (b.valorCorrigido ?? 0) - (a.valorCorrigido ?? 0))
    : []

  const melhor = ordenados[0]

  return (
    <div className="space-y-6">

      {/* Formulário */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Comparar todos os índices no mesmo período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor original (R$)</label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
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
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>
        )}

        <button
          onClick={() => buscar()}
          disabled={loading}
          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-105 disabled:hover:scale-100"
        >
          {loading ? 'Consultando todos os índices...' : 'Comparar índices →'}
        </button>
      </div>

      {/* Banner de aviso — dados incompletos */}
      {aviso && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800 mb-1">Dados ainda não publicados para alguns índices</p>
              <p className="text-sm text-amber-700 mb-3">
                <strong>{aviso.indicesIncompletos.join(', ')}</strong> ainda não têm publicação para todo o período solicitado.
                Os resultados acima foram calculados com períodos diferentes entre os índices, o que torna a comparação imprecisa.
              </p>
              <p className="text-sm text-amber-700 mb-4">
                Deseja recalcular usando apenas os <strong>{aviso.minMeses} meses</strong> disponíveis em todos os índices?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={recalcularComMesesDisponiveis}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all"
                >
                  Recalcular com {aviso.minMeses} meses disponíveis →
                </button>
                <button
                  onClick={() => setAviso(null)}
                  className="bg-white border border-amber-300 text-amber-700 font-medium px-5 py-2 rounded-xl text-sm hover:bg-amber-50 transition-all"
                >
                  Manter assim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Consultando IPCA, IGP-M, INPC, CDI e SELIC simultaneamente...</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="space-y-4">

          {/* Cards dos índices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {ordenados.map((r, i) => {
              const cor = COR[r.indice] ?? COR.IPCA
              const isMelhor = i === 0 && !r.erro
              return (
                <div key={r.indice} className={`relative rounded-2xl border-2 p-5 flex flex-col gap-2 ${cor.bg} ${cor.borda}`}>
                  {isMelhor && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        🏆 Maior rendimento
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${cor.badge}`}>{r.indice}</span>
                    <span className="text-xs text-gray-500">{r.periodos ?? 0} meses</span>
                  </div>

                  {r.erro ? (
                    <p className="text-xs text-gray-400 mt-2">{r.erro}</p>
                  ) : (
                    <>
                      <p className={`text-lg font-black mt-1 leading-tight ${cor.texto}`}>{moeda(r.valorCorrigido!)}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Variação: <span className="font-bold">{pct(r.variacao!)}</span>
                      </p>
                      <p className="text-xs text-gray-500">Fator: {fmtFator(r.fator!)}</p>
                      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-1">
                        Ganho: <span className="font-semibold text-gray-700">{moeda(r.valorCorrigido! - resultado.valor_original)}</span>
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tabela comparativa */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Tabela comparativa</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Valor original: {moeda(resultado.valor_original)} · Ordenado por maior rendimento
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-6 py-3 text-left font-semibold">Índice</th>
                  <th className="px-6 py-3 text-left font-semibold hidden sm:table-cell">Descrição</th>
                  <th className="px-6 py-3 text-right font-semibold">Variação</th>
                  <th className="px-6 py-3 text-right font-semibold">Fator</th>
                  <th className="px-6 py-3 text-right font-semibold">Valor Corrigido</th>
                  <th className="px-6 py-3 text-right font-semibold">Ganho</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((r, i) => {
                  const cor = COR[r.indice] ?? COR.IPCA
                  return (
                    <tr key={r.indice} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${cor.badge}`}>{r.indice}</span>
                        {i === 0 && !r.erro && <span className="ml-2 text-xs">🏆</span>}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.label}</td>
                      {r.erro ? (
                        <td colSpan={4} className="px-6 py-3 text-xs text-gray-400">{r.erro}</td>
                      ) : (
                        <>
                          <td className={`px-6 py-3 text-right font-mono font-semibold ${r.variacao! >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {pct(r.variacao!)}
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-gray-600">{fmtFator(r.fator!)}</td>
                          <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">{moeda(r.valorCorrigido!)}</td>
                          <td className="px-6 py-3 text-right font-mono font-semibold text-emerald-700">
                            {moeda(r.valorCorrigido! - resultado.valor_original)}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { TIPO, type Indice } from '@/lib/indices'

// ── Constantes ─────────────────────────────────────────────────────────────

const TODOS_INDICES: Indice[] = [
  'IPCA', 'IGPM', 'IGPDI', 'INPC', 'INCC',
  'CDI', 'SELIC', 'TR', 'POUPANCA', 'FGTS',
  'USD', 'SM',
]

const COR: Record<Indice, string> = {
  IPCA:     '#059669',
  IGPM:     '#2563eb',
  IGPDI:    '#0284c7',
  INPC:     '#9333ea',
  INCC:     '#7c3aed',
  CDI:      '#ea580c',
  SELIC:    '#e11d48',
  TR:       '#0891b2',
  POUPANCA: '#65a30d',
  FGTS:     '#ca8a04',
  USD:      '#0d9488',
  SM:       '#d97706',
}

// Paleta pra cestas (cores diferentes das oficiais pra não confundir)
const CESTA_COLORS = ['#475569', '#4f46e5', '#db2777', '#dc2626', '#0891b2', '#a855f7']

const NOMES_CURTOS: Record<Indice, string> = {
  IPCA: 'IPCA',
  IGPM: 'IGP-M',
  IGPDI: 'IGP-DI',
  INPC: 'INPC',
  INCC: 'INCC',
  CDI: 'CDI',
  SELIC: 'SELIC',
  TR: 'TR',
  POUPANCA: 'Poupança',
  FGTS: 'FGTS',
  USD: 'Dólar',
  SM: 'Salário Mín.',
}

type Periodo = '12m' | '5a' | '10a' | 'tudo'

const PERIODOS: { key: Periodo; label: string; meses: number | null }[] = [
  { key: '12m', label: '12 meses', meses: 12 },
  { key: '5a', label: '5 anos', meses: 60 },
  { key: '10a', label: '10 anos', meses: 120 },
  { key: 'tudo', label: 'Tudo', meses: null },
]

interface Dado {
  data: string
  valor: string
}

interface Resposta {
  dados: Dado[]
}

interface CestaResumo {
  id: string
  nome: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseData(dataStr: string): number {
  const [dd, mm, yyyy] = dataStr.split('/').map(Number)
  return new Date(yyyy, (mm || 1) - 1, dd || 1).getTime()
}

function reduzirSerie<T>(pontos: T[], limite = 250): T[] {
  if (pontos.length <= limite) return pontos
  const step = Math.ceil(pontos.length / limite)
  return pontos.filter((_, i) => i % step === 0)
}

function isCesta(id: string): boolean {
  return id.startsWith('cesta:')
}

function endpointSerie(id: string): string {
  if (isCesta(id)) return `/api/cestas/${id.slice(6)}/serie`
  return `/api/serie/${id}`
}

function tipoDoItem(id: string): 'taxa_mensal' | 'valor_absoluto' {
  // Cestas sempre são taxa_mensal (validação do banco impede misturar com valor_absoluto)
  if (isCesta(id)) return 'taxa_mensal'
  return TIPO[id as Indice]
}

// ── Componente principal ───────────────────────────────────────────────────

export function EvolucaoCliente() {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(['IPCA', 'CDI', 'POUPANCA']))
  const [periodo, setPeriodo] = useState<Periodo>('5a')
  const [cestas, setCestas] = useState<CestaResumo[]>([])
  const [cache, setCache] = useState<Record<string, Dado[]>>({})
  const [carregando, setCarregando] = useState<Set<string>>(new Set())
  const [erros, setErros] = useState<Record<string, string>>({})

  // Busca cestas do usuário
  useEffect(() => {
    fetch('/api/cestas')
      .then(async (r) => {
        const txt = await r.text()
        if (!txt.trim().startsWith('{')) return
        return JSON.parse(txt) as { cestas?: CestaResumo[] }
      })
      .then((d) => {
        if (d?.cestas) setCestas(d.cestas)
      })
      .catch(() => {})
  }, [])

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  // Busca séries dos itens selecionados ainda não carregados
  useEffect(() => {
    for (const id of selecionados) {
      if (cache[id] || carregando.has(id) || erros[id]) continue
      setCarregando((prev) => new Set(prev).add(id))
      fetch(endpointSerie(id))
        .then(async (r) => {
          const texto = await r.text()
          if (!texto.trim().startsWith('{') && !texto.trim().startsWith('[')) {
            throw new Error(`Resposta inválida (${r.status})`)
          }
          return JSON.parse(texto) as Resposta & { error?: string }
        })
        .then((data) => {
          if (data.error) {
            setErros((prev) => ({ ...prev, [id]: data.error! }))
            return
          }
          setCache((prev) => ({ ...prev, [id]: data.dados }))
        })
        .catch((e) => setErros((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : String(e) })))
        .finally(() => {
          setCarregando((prev) => {
            const n = new Set(prev)
            n.delete(id)
            return n
          })
        })
    }
  }, [selecionados, cache, carregando, erros])

  // Helper pra label/cor de um id
  function labelDoId(id: string): string {
    if (isCesta(id)) {
      const c = cestas.find((x) => x.id === id.slice(6))
      return c ? c.nome : 'Cesta'
    }
    return NOMES_CURTOS[id as Indice] ?? id
  }

  function corDoId(id: string): string {
    if (isCesta(id)) {
      const cestaIdx = cestas.findIndex((c) => c.id === id.slice(6))
      return CESTA_COLORS[(cestaIdx >= 0 ? cestaIdx : 0) % CESTA_COLORS.length]
    }
    return COR[id as Indice] ?? '#6b7280'
  }

  // Calcula pontos normalizados pra cada item selecionado, alinhados por data
  const dadosGrafico = useMemo(() => {
    const itensAtivos = Array.from(selecionados).filter((id) => cache[id])
    if (itensAtivos.length === 0) return []

    const periodoMeses = PERIODOS.find((p) => p.key === periodo)?.meses

    const slices: Record<string, Dado[]> = {}
    for (const id of itensAtivos) {
      const full = cache[id]
      slices[id] = periodoMeses ? full.slice(0, periodoMeses) : full
    }

    let timestampInicial = 0
    for (const id of itensAtivos) {
      const slice = slices[id]
      if (slice.length === 0) continue
      const primeiraData = slice[slice.length - 1].data
      const ts = parseData(primeiraData)
      if (ts > timestampInicial) timestampInicial = ts
    }
    if (!timestampInicial) return []

    const slicesAlinhados: Record<string, Dado[]> = {}
    for (const id of itensAtivos) {
      const slice = slices[id]
      const idxInicio = slice.findIndex((d) => parseData(d.data) <= timestampInicial)
      slicesAlinhados[id] = idxInicio >= 0 ? slice.slice(0, idxInicio + 1) : []
    }

    const normalizadas: Record<string, Map<string, number>> = {}
    for (const id of itensAtivos) {
      const cronologico = [...slicesAlinhados[id]].reverse()
      const m = new Map<string, number>()
      if (cronologico.length === 0) {
        normalizadas[id] = m
        continue
      }
      if (tipoDoItem(id) === 'valor_absoluto') {
        const base = parseFloat(cronologico[0].valor.replace(',', '.'))
        for (const d of cronologico) {
          const v = parseFloat(d.valor.replace(',', '.'))
          m.set(d.data, base ? (v / base) * 100 : 100)
        }
      } else {
        let acum = 100
        cronologico.forEach((d, i) => {
          if (i === 0) {
            m.set(d.data, 100)
          } else {
            const tx = parseFloat(d.valor.replace(',', '.')) / 100
            acum = acum * (1 + tx)
            m.set(d.data, acum)
          }
        })
      }
      normalizadas[id] = m
    }

    const todasDatas = new Set<string>()
    for (const id of itensAtivos) {
      for (const data of normalizadas[id].keys()) todasDatas.add(data)
    }

    type Ponto = { data: string; ts: number; [k: string]: number | string }
    const merged: Ponto[] = []
    for (const data of todasDatas) {
      const entry: Ponto = { data, ts: parseData(data) }
      for (const id of itensAtivos) {
        const v = normalizadas[id].get(data)
        if (v !== undefined) entry[id] = v
      }
      merged.push(entry)
    }

    merged.sort((a, b) => (a.ts as number) - (b.ts as number))
    return reduzirSerie(merged)
  }, [selecionados, cache, periodo])

  const itensAtivos = useMemo(
    () => Array.from(selecionados).filter((id) => cache[id]),
    [selecionados, cache]
  )

  const algumCarregando = carregando.size > 0

  function selecionarTodos() {
    const todos = [...TODOS_INDICES, ...cestas.map((c) => `cesta:${c.id}`)]
    setSelecionados(new Set(todos))
  }

  return (
    <div className="space-y-4">
      {/* Card de seleção */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {/* Período */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-700">Período</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  periodo === p.key
                    ? 'bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700'
                    : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Seleção */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-semibold text-gray-700">
              Itens na comparação
              <span className="text-gray-400 font-normal ml-1">
                ({selecionados.size} selecionado{selecionados.size === 1 ? '' : 's'})
              </span>
            </label>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={selecionarTodos}
                className="text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelecionados(new Set())}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                Nenhum
              </button>
            </div>
          </div>

          {/* Índices oficiais */}
          <div className="mb-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Índices oficiais</p>
            <div className="flex flex-wrap gap-2">
              {TODOS_INDICES.map((indice) => {
                const ativo = selecionados.has(indice)
                const cor = COR[indice]
                const carregandoEste = carregando.has(indice)
                return (
                  <button
                    key={indice}
                    type="button"
                    onClick={() => toggleSelecao(indice)}
                    disabled={carregandoEste}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: ativo ? cor : 'transparent',
                      borderColor: cor,
                      color: ativo ? '#ffffff' : cor,
                    }}
                  >
                    {ativo && <span className="text-[10px]">✓</span>}
                    {NOMES_CURTOS[indice]}
                    {carregandoEste && (
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cestas */}
          {cestas.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Minhas cestas</p>
              <div className="flex flex-wrap gap-2">
                {cestas.map((c, i) => {
                  const key = `cesta:${c.id}`
                  const ativo = selecionados.has(key)
                  const cor = CESTA_COLORS[i % CESTA_COLORS.length]
                  const carregandoEste = carregando.has(key)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelecao(key)}
                      disabled={carregandoEste}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all disabled:opacity-50"
                      style={{
                        backgroundColor: ativo ? cor : 'transparent',
                        borderColor: cor,
                        color: ativo ? '#ffffff' : cor,
                      }}
                    >
                      {ativo && <span className="text-[10px]">✓</span>}
                      <span>📁</span>
                      {c.nome}
                      {carregandoEste && (
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {Object.keys(erros).length > 0 && (
            <p className="mt-3 text-xs text-red-600">
              Erro ao carregar: {Object.keys(erros).map((k) => labelDoId(k)).join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
        {selecionados.size === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">Selecione ao menos 1 item acima para ver a evolução</p>
          </div>
        ) : itensAtivos.length === 0 && algumCarregando ? (
          <div className="py-16 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Evolução comparada</h3>
                <p className="text-xs text-gray-400 mt-0.5">Base 100 no início do período · {dadosGrafico.length} pontos</p>
              </div>
              {algumCarregando && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Carregando mais itens...
                </div>
              )}
            </div>

            <div style={{ width: '100%', height: 360 }}>
              <ResponsiveContainer>
                <LineChart data={dadosGrafico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4, fontWeight: 600 }}
                    itemStyle={{ color: '#fff', fontSize: 12 }}
                    formatter={(v) => Number(v).toFixed(2)}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                    iconType="circle"
                  />
                  {itensAtivos.map((id) => (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={id}
                      stroke={corDoId(id)}
                      strokeWidth={2}
                      dot={false}
                      name={labelDoId(id)}
                      animationDuration={500}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              Cada item começa em 100 e mostra quanto rendeu acumulado a partir daí. Quanto maior o valor final, mais o item subiu no período.
            </p>
          </>
        )}
      </div>

      {/* Tabela de resumo */}
      {itensAtivos.length > 0 && dadosGrafico.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">Resumo do período</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {dadosGrafico[0]?.data} → {dadosGrafico[dadosGrafico.length - 1]?.data}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-6 py-3 text-left font-semibold">Item</th>
                  <th className="px-6 py-3 text-right font-semibold">Valor final (base 100)</th>
                  <th className="px-6 py-3 text-right font-semibold">Variação acumulada</th>
                </tr>
              </thead>
              <tbody>
                {[...itensAtivos]
                  .map((id) => ({
                    id,
                    valor: dadosGrafico[dadosGrafico.length - 1]?.[id] as number | undefined,
                  }))
                  .filter((r) => r.valor !== undefined)
                  .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
                  .map(({ id, valor }, i) => (
                    <tr key={id} className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex items-center gap-2 text-xs font-bold text-white px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: corDoId(id) }}
                        >
                          {isCesta(id) && '📁 '}{labelDoId(id)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">
                        {(valor ?? 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-semibold text-emerald-700">
                        {((valor ?? 100) - 100 >= 0 ? '+' : '')}
                        {((valor ?? 100) - 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

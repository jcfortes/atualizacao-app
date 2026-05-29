'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { INDICE_LABEL } from '@/lib/indices'
import { INDICES_PERMITIDOS_CESTA, type Cesta, type ComposicaoItem, nomeIndiceCurto } from '@/lib/cestas'
import { Trash2 } from 'lucide-react'

interface Props {
  cestaExistente?: Cesta
}

interface SerieResp {
  dados: { data: string; valor: string }[]
}

// Aproximadamente 60 meses (5 anos) para o preview
const MAX_MESES_PREVIEW = 60

// Quando o usuário adiciona/remove um índice, redistribui igualmente os pesos
function redistribuirPesos(items: ComposicaoItem[]): ComposicaoItem[] {
  if (items.length === 0) return items
  const peso = 1 / items.length
  return items.map((c) => ({ ...c, peso }))
}

export function EditorCesta({ cestaExistente }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(cestaExistente?.nome ?? '')
  const [descricao, setDescricao] = useState(cestaExistente?.descricao ?? '')
  const [composicao, setComposicao] = useState<ComposicaoItem[]>(
    cestaExistente?.composicao ?? []
  )
  const [series, setSeries] = useState<Record<string, { data: string; valor: string }[]>>({})
  const [carregando, setCarregando] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')

  const editando = !!cestaExistente

  // Busca série dos índices da composição (cache local)
  useEffect(() => {
    for (const item of composicao) {
      if (series[item.indice] || carregando.has(item.indice)) continue
      setCarregando((prev) => new Set(prev).add(item.indice))
      fetch(`/api/serie/${item.indice}`)
        .then(async (r) => {
          const texto = await r.text()
          if (!texto.trim().startsWith('{') && !texto.trim().startsWith('[')) {
            throw new Error(`Resposta inválida (${r.status})`)
          }
          return JSON.parse(texto) as SerieResp & { error?: string }
        })
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setSeries((prev) => ({ ...prev, [item.indice]: data.dados }))
        })
        .catch(() => {
          // silenciar erro de fetch individual; o preview some até resolver
        })
        .finally(() => {
          setCarregando((prev) => {
            const n = new Set(prev)
            n.delete(item.indice)
            return n
          })
        })
    }
  }, [composicao, series, carregando])

  // ── Manipulação da composição ───────────────────────────────────────────
  function toggleIndice(indice: typeof INDICES_PERMITIDOS_CESTA[number]) {
    setComposicao((prev) => {
      const exists = prev.find((c) => c.indice === indice)
      if (exists) {
        // Remove e redistribui pesos
        const semEste = prev.filter((c) => c.indice !== indice)
        return redistribuirPesos(semEste)
      } else {
        // Adiciona com peso proporcional e redistribui
        const novo: ComposicaoItem = { indice, peso: 1 / (prev.length + 1) }
        return redistribuirPesos([...prev, novo])
      }
    })
  }

  function atualizarPeso(indice: string, novoPesoStr: string) {
    const num = parseFloat(novoPesoStr.replace(',', '.'))
    if (Number.isNaN(num) || num < 0) return
    setComposicao((prev) =>
      prev.map((c) => (c.indice === indice ? { ...c, peso: num / 100 } : c))
    )
  }

  function redistribuirIgualmente() {
    if (composicao.length === 0) return
    setComposicao((prev) => prev.map((c) => ({ ...c, peso: 1 / prev.length })))
  }

  // ── Cálculo da série da cesta (preview) ──────────────────────────────────
  const serieCesta = useMemo(() => {
    if (composicao.length === 0) return []
    const todasCarregadas = composicao.every((c) => series[c.indice])
    if (!todasCarregadas) return []

    // Pega o conjunto de datas em todas as séries (intersecção)
    const maps: Record<string, Map<string, number>> = {}
    for (const item of composicao) {
      const m = new Map<string, number>()
      for (const d of series[item.indice]) {
        m.set(d.data, parseFloat(d.valor.replace(',', '.')))
      }
      maps[item.indice] = m
    }

    const datasComum: string[] = []
    const ref = composicao[0].indice
    for (const data of maps[ref].keys()) {
      const temTodos = composicao.every((c) => maps[c.indice].has(data))
      if (temTodos) datasComum.push(data)
    }
    // Datas mais recentes primeiro (formato BCB), pega últimas N
    const ultimas = datasComum.slice(0, MAX_MESES_PREVIEW).reverse()

    // Calcula taxa composta + acumulado base 100 (cronológico)
    let acum = 100
    const resultado: { data: string; taxa: number; acumulado: number }[] = []
    for (const data of ultimas) {
      let taxa = 0
      for (const item of composicao) {
        taxa += item.peso * (maps[item.indice].get(data) ?? 0)
      }
      acum = acum * (1 + taxa / 100)
      resultado.push({ data, taxa, acumulado: acum })
    }
    return resultado
  }, [composicao, series])

  const somaPesos = composicao.reduce((s, c) => s + c.peso, 0)
  const pesoOk = Math.abs(somaPesos - 1) < 0.01
  const algumCarregando = carregando.size > 0

  // ── Salvar / Atualizar ───────────────────────────────────────────────────
  async function salvar() {
    setErro('')
    if (!nome.trim()) { setErro('Informe um nome pra cesta'); return }
    if (composicao.length < 2) { setErro('Selecione ao menos 2 índices'); return }
    if (!pesoOk) { setErro(`Os pesos devem somar 100% (atualmente: ${(somaPesos * 100).toFixed(1)}%)`); return }
    setSalvando(true)
    try {
      const url = editando ? `/api/cestas/${cestaExistente!.id}` : '/api/cestas'
      const method = editando ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          composicao: composicao.map((c) => ({ indice: c.indice, peso: Number(c.peso.toFixed(6)) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      // Redireciona pra página da cesta (atualiza sidebar via navegação)
      router.push(`/cestas/${editando ? cestaExistente!.id : data.cesta.id}`)
      router.refresh()
    } catch (e) {
      setErro(String(e instanceof Error ? e.message : e))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!editando) return
    if (!confirm(`Excluir a cesta "${cestaExistente!.nome}"? Esta ação não pode ser desfeita.`)) return
    setExcluindo(true)
    try {
      const res = await fetch(`/api/cestas/${cestaExistente!.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir')
      }
      router.push('/cestas/nova')
      router.refresh()
    } catch (e) {
      setErro(String(e instanceof Error ? e.message : e))
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Card: Identificação */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Identificação</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Nome da cesta *
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: Custo do meu negócio"
            maxLength={80}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={descricao ?? ''}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="ex: Composição usada nos contratos de prestação de serviço"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Card: Composição */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-900">Composição</h3>
          <button
            type="button"
            onClick={redistribuirIgualmente}
            disabled={composicao.length === 0}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-30"
          >
            Distribuir pesos igualmente
          </button>
        </div>

        {/* Chips de seleção */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Selecione os índices ({composicao.length} de {INDICES_PERMITIDOS_CESTA.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {INDICES_PERMITIDOS_CESTA.map((indice) => {
              const ativo = composicao.some((c) => c.indice === indice)
              return (
                <button
                  key={indice}
                  type="button"
                  onClick={() => toggleIndice(indice)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    ativo
                      ? 'bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  {ativo && <span className="text-[10px]">✓</span>}
                  {nomeIndiceCurto(indice)}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Só índices de taxa mensal (%) podem entrar em cestas. Dólar e Salário Mínimo não estão disponíveis aqui.
          </p>
        </div>

        {/* Tabela de pesos */}
        {composicao.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Pesos
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Índice</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600 w-32">Peso (%)</th>
                    <th className="w-12 text-center">
                      <span className="inline-flex items-center justify-center bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-md">
                        Ações
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {composicao.map((item) => (
                    <tr key={item.indice} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 text-gray-700">
                        <span className="font-semibold">{nomeIndiceCurto(item.indice)}</span>
                        <span className="text-gray-400 text-xs ml-2">{INDICE_LABEL[item.indice].split(' — ')[1]}</span>
                      </td>
                      <td className="px-4 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={(item.peso * 100).toFixed(2)}
                          onChange={(e) => atualizarPeso(item.indice, e.target.value)}
                          className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-2">
                        <button
                          type="button"
                          onClick={() => toggleIndice(item.indice)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                          aria-label="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className={`border-t-2 ${pesoOk ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                    <td className="px-4 py-2 font-bold text-gray-900">Total</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${pesoOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {(somaPesos * 100).toFixed(2)}%
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {!pesoOk && composicao.length >= 2 && (
              <p className="text-xs text-amber-700 mt-2">
                ⚠️ Os pesos devem somar 100%. Ajuste os valores ou use &ldquo;Distribuir pesos igualmente&rdquo;.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Preview do gráfico */}
      {composicao.length >= 2 && pesoOk && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Preview — últimos 5 anos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Acumulado base 100 da cesta composta</p>
            </div>
            {algumCarregando && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Carregando séries...
              </div>
            )}
          </div>
          {serieCesta.length > 0 ? (
            <>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={serieCesta} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4, fontWeight: 600 }}
                      itemStyle={{ color: '#fff', fontSize: 12 }}
                      formatter={(v) => [Number(v).toFixed(2), 'Acumulado']}
                    />
                    <Line type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Acumulado no período</p>
                  <p className="font-bold text-emerald-700">
                    {serieCesta.length > 0 ? `+${(serieCesta[serieCesta.length - 1].acumulado - 100).toFixed(2)}%` : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Taxa do último mês</p>
                  <p className="font-bold text-gray-900">
                    {serieCesta.length > 0 ? `${serieCesta[serieCesta.length - 1].taxa >= 0 ? '+' : ''}${serieCesta[serieCesta.length - 1].taxa.toFixed(4).replace('.', ',')}%` : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pontos no preview</p>
                  <p className="font-bold text-gray-900">{serieCesta.length}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-gray-400">
              {algumCarregando ? 'Aguarde, calculando...' : 'Selecione índices válidos pra ver o preview'}
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          {editando && (
            <button
              type="button"
              onClick={excluir}
              disabled={excluindo}
              className="text-sm text-red-600 hover:text-red-700 font-semibold disabled:opacity-50 px-4 py-2"
            >
              {excluindo ? 'Excluindo...' : 'Excluir cesta'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 font-semibold px-4 py-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !nome.trim() || composicao.length < 2 || !pesoOk}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg transition-all text-sm shadow-sm"
          >
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar cesta →'}
          </button>
        </div>
      </div>
    </div>
  )
}

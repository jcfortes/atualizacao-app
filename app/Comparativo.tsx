'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { INDICE_LABEL, type Indice } from '@/lib/indices'
import { useStoredState, STORAGE_KEYS, limparParametrosArmazenados } from '@/lib/useStoredState'
import { calcularEncargos, parsePctBR, type ResultadoEncargos } from '@/lib/encargos'
import { Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react'

const TODOS_INDICES: Indice[] = [
  'IPCA', 'IGPM', 'IGPDI', 'INPC', 'INCC',
  'CDI', 'SELIC', 'TR', 'POUPANCA', 'FGTS',
  'USD', 'SM',
]

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// 'YYYY-MM' → 'mai/2026'
function fmtMesCurto(yyyymm: string): string {
  if (!yyyymm) return ''
  const [a, m] = yyyymm.split('-').map(Number)
  if (!a || !m || m < 1 || m > 12) return yyyymm
  return `${MESES_PT[m - 1]}/${a}`
}

// Soma N meses ao 'YYYY-MM' (N pode ser negativo)
function somarMeses(yyyymm: string, n: number): string {
  const [a, m] = yyyymm.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

function moedaSemSimbolo(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(4).replace('.', ',')}%`
}

function fmtFator(v: number) {
  return v.toFixed(6).replace('.', ',')
}

interface ResultadoItem {
  id: string
  label: string
  tipo: 'indice' | 'cesta'
  fator?: number
  valorCorrigido?: number
  variacao?: number
  periodos?: number
  erro?: string
}

interface ResultadoComparativo {
  valor_original: number
  resultados: ResultadoItem[]
}

interface CestaResumo {
  id: string
  nome: string
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
const COR_INDICE: Record<string, { bg: string; borda: string; texto: string; badge: string }> = {
  IPCA:     { bg: 'bg-emerald-50',  borda: 'border-emerald-200', texto: 'text-emerald-800', badge: 'bg-emerald-600' },
  IGPM:     { bg: 'bg-blue-50',     borda: 'border-blue-200',    texto: 'text-blue-800',    badge: 'bg-blue-600' },
  IGPDI:    { bg: 'bg-sky-50',      borda: 'border-sky-200',     texto: 'text-sky-800',     badge: 'bg-sky-600' },
  INPC:     { bg: 'bg-purple-50',   borda: 'border-purple-200',  texto: 'text-purple-800',  badge: 'bg-purple-600' },
  INCC:     { bg: 'bg-violet-50',   borda: 'border-violet-200',  texto: 'text-violet-800',  badge: 'bg-violet-600' },
  CDI:      { bg: 'bg-orange-50',   borda: 'border-orange-200',  texto: 'text-orange-800',  badge: 'bg-orange-500' },
  SELIC:    { bg: 'bg-rose-50',     borda: 'border-rose-200',    texto: 'text-rose-800',    badge: 'bg-rose-600' },
  TR:       { bg: 'bg-cyan-50',     borda: 'border-cyan-200',    texto: 'text-cyan-800',    badge: 'bg-cyan-600' },
  POUPANCA: { bg: 'bg-lime-50',     borda: 'border-lime-200',    texto: 'text-lime-800',    badge: 'bg-lime-600' },
  FGTS:     { bg: 'bg-yellow-50',   borda: 'border-yellow-200',  texto: 'text-yellow-800',  badge: 'bg-yellow-600' },
  USD:      { bg: 'bg-teal-50',     borda: 'border-teal-200',    texto: 'text-teal-800',    badge: 'bg-teal-600' },
  SM:       { bg: 'bg-amber-50',    borda: 'border-amber-200',   texto: 'text-amber-800',   badge: 'bg-amber-600' },
}

// Cor padrão pra cestas (usuário cria com nomes próprios)
const COR_CESTA = {
  bg: 'bg-slate-50',
  borda: 'border-slate-300',
  texto: 'text-slate-800',
  badge: 'bg-slate-700',
}

function corDoItem(r: ResultadoItem) {
  if (r.tipo === 'cesta') return COR_CESTA
  return COR_INDICE[r.id] ?? COR_INDICE.IPCA
}

export function Comparativo() {
  // Compartilhados com a Calculadora (mesmas chaves)
  const [valor, setValor] = useStoredState<string>(STORAGE_KEYS.valor, '')
  const [inicio, setInicio] = useStoredState<string>(STORAGE_KEYS.inicio, '')
  const [fim, setFim] = useStoredState<string>(STORAGE_KEYS.fim, '')
  // selecionados aceita índices oficiais ('IPCA') ou cestas ('cesta:UUID')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [cestas, setCestas] = useState<CestaResumo[]>([])
  const [resultado, setResultado] = useState<ResultadoComparativo | null>(null)
  const [modoSomenteIndices, setModoSomenteIndices] = useState(false)
  // Encargos (opcionais) — compartilhados com a Calculadora via mesmas chaves
  const [jurosMora, setJurosMora] = useStoredState<string>(STORAGE_KEYS.jurosMora, '')
  const [multa, setMulta] = useStoredState<string>(STORAGE_KEYS.multa, '')
  const [despesas, setDespesas] = useStoredState<string>(STORAGE_KEYS.despesas, '')
  const [despesasTipo, setDespesasTipo] = useStoredState<'reais' | 'percentual'>(STORAGE_KEYS.despesasTipo, 'reais')
  const [encargosAbertos, setEncargosAbertos] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [aviso, setAviso] = useState<{
    minMeses: number
    ultimoMesComum: string                // 'YYYY-MM' do último mês com dado em TODOS os índices
    mesSolicitado: string                  // 'YYYY-MM' do fim solicitado
    indicesIncompletos: { label: string; ultimoMes: string }[]
  } | null>(null)

  const searchParams = useSearchParams()
  const autoExecutado = useRef(false)

  // Pré-seleção via URL (?preselect=IPCA ou ?preselect=cesta:UUID)
  // Quando o usuário chega da tela da Calculadora, já vem com o índice usado + alguns populares
  useEffect(() => {
    const preselect = searchParams.get('preselect')
    if (!preselect) return
    const padraoComparar: string[] = ['IPCA', 'IGPM', 'INPC']
    const set = new Set<string>(padraoComparar)
    set.add(preselect)
    setSelecionados(set)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      .catch(() => {
        // silencioso
      })
  }, [])

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function mesParaBCB(mes: string, ultimo = false) {
    if (!mes) return ''
    const [ano, m] = mes.split('-')
    if (ultimo) {
      const ultimoDia = new Date(parseInt(ano), parseInt(m), 0).getDate()
      return `${String(ultimoDia).padStart(2, '0')}/${m}/${ano}`
    }
    return `01/${m}/${ano}`
  }

  function mesesParaFim(meses: number): string {
    const [ai, mi] = inicio.split('-').map(Number)
    const totalMes = (ai * 12 + mi - 1) + (meses - 1)
    const novoAno = Math.floor(totalMes / 12)
    const novoMes = (totalMes % 12) + 1
    return `${novoAno}-${String(novoMes).padStart(2, '0')}`
  }

  async function buscar(fimOverride?: string) {
    // Valor é OPCIONAL — sem valor, mostra apenas variação/fator
    const semValor = !valor || valor.trim() === ''
    const num = semValor ? 1 : parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (!inicio || !fim) { setErro('Informe o período (início e fim).'); return }
    if (inicio >= fim) { setErro('A data de início deve ser anterior à data final.'); return }
    if (selecionados.size === 0) { setErro('Selecione ao menos um índice ou cesta para comparar.'); return }
    setModoSomenteIndices(semValor)
    setErro('')
    setAviso(null)
    setLoading(true)
    setResultado(null)
    try {
      // Separa índices oficiais de cestas
      const indicesIds: string[] = []
      const cestasIds: string[] = []
      for (const id of selecionados) {
        if (id.startsWith('cesta:')) cestasIds.push(id.slice(6))
        else indicesIds.push(id)
      }

      const fimUsado = fimOverride ?? fim
      const params = new URLSearchParams({
        valor: String(num),
        inicio: mesParaBCB(inicio),
        fim: mesParaBCB(fimUsado, true),
      })
      if (indicesIds.length > 0) params.set('indices', indicesIds.join(','))
      if (cestasIds.length > 0) params.set('cestas', cestasIds.join(','))

      const res = await fetch(`/api/comparar?${params}`)
      const txt = await res.text()
      if (!txt.trim().startsWith('{')) {
        throw new Error(`Resposta inválida do servidor (${res.status})`)
      }
      const data: ResultadoComparativo & { error?: string } = JSON.parse(txt)
      if (data.error) { setErro(data.error); return }

      const periodos = data.resultados.filter(r => !r.erro).map(r => r.periodos ?? 0)
      const minMeses = Math.min(...periodos)
      const maxMeses = Math.max(...periodos)

      if (minMeses < maxMeses && !fimOverride) {
        // Para cada índice incompleto, calcula o último mês com dado: inicio + (periodos - 1)
        const incompletos = data.resultados
          .filter(r => !r.erro && (r.periodos ?? 0) < maxMeses)
          .map(r => ({
            label: r.label,
            ultimoMes: somarMeses(inicio, (r.periodos ?? 0) - 1),
          }))
        // Último mês comum a TODOS = inicio + (minMeses - 1)
        const ultimoMesComum = somarMeses(inicio, minMeses - 1)
        setAviso({ minMeses, ultimoMesComum, mesSolicitado: fim, indicesIncompletos: incompletos })
        setResultado(data)
      } else {
        setResultado(data)
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao conectar com a API. Tente novamente.')
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

  // Auto-executa quando chega com ?preselect e os campos (valor/inicio/fim) já estão preenchidos
  useEffect(() => {
    if (autoExecutado.current) return
    if (!searchParams.get('preselect')) return
    if (!valor || !inicio || !fim) return
    if (selecionados.size === 0) return
    autoExecutado.current = true
    buscar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, inicio, fim, selecionados])

  function selecionarTodos() {
    const todos = [...TODOS_INDICES, ...cestas.map((c) => `cesta:${c.id}`)]
    setSelecionados(new Set(todos))
  }

  function limpar() {
    setValor('')
    setInicio('')
    setFim('')
    setSelecionados(new Set())
    setResultado(null)
    setErro('')
    setAviso(null)
    setModoSomenteIndices(false)
    setJurosMora('')
    setMulta('')
    setDespesas('')
    setDespesasTipo('reais')
    setEncargosAbertos(false)
    limparParametrosArmazenados()
  }

  // Calcula encargos por índice (mapa indexId → ResultadoEncargos), só quando há valor e encargos
  const encargosPorItem: Record<string, ResultadoEncargos> = (() => {
    if (!resultado || modoSomenteIndices) return {}
    const j = parsePctBR(jurosMora)
    const m = parsePctBR(multa)
    const d = parsePctBR(despesas)
    if (j <= 0 && m <= 0 && d <= 0) return {}
    const out: Record<string, ResultadoEncargos> = {}
    for (const r of resultado.resultados) {
      if (r.erro || !r.valorCorrigido) continue
      out[r.id] = calcularEncargos({
        valorAtualizado: r.valorCorrigido,
        meses: r.periodos ?? 0,
        jurosMoraPct: j,
        multaPct: m,
        despesas: d,
        despesasTipo,
      })
    }
    return out
  })()
  const temEncargosAplicados = Object.keys(encargosPorItem).length > 0

  // Ordena pelo maior valor corrigido
  const ordenados = resultado
    ? [...resultado.resultados].sort((a, b) => {
        // Quando há encargos, ordena pelo total devido (maior primeiro)
        const va = encargosPorItem[a.id]?.total ?? a.valorCorrigido ?? 0
        const vb = encargosPorItem[b.id]?.total ?? b.valorCorrigido ?? 0
        return vb - va
      })
    : []

  const totalSelecionado = selecionados.size

  return (
    <div className="space-y-6">

      {/* Formulário */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Comparar índices no mesmo período</h2>
        <p className="text-xs text-gray-500 mb-5">
          Sem valor, mostramos só a variação dos índices. Informando um valor, aplicamos a correção a ele.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Valor original (R$) <span className="text-xs font-normal text-gray-400">— opcional</span>
            </label>
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

        {/* Encargos (opcional) — só faz sentido em modo com valor */}
        {valor && valor.trim() !== '' && (
          <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setEncargosAbertos((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Adicionar encargos
                <span className="text-xs font-normal text-gray-400">(juros, multa, despesas)</span>
              </span>
              {encargosAbertos
                ? <ChevronUp className="w-4 h-4 text-gray-500" />
                : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {encargosAbertos && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Juros de mora (% a.m.)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 1,00"
                      value={jurosMora}
                      onChange={(e) => setJurosMora(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Multa (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 2,00"
                      value={multa}
                      onChange={(e) => setMulta(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Outras despesas</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={despesasTipo === 'reais' ? 'Ex: 150,00' : 'Ex: 10,00'}
                      value={despesas}
                      onChange={(e) => setDespesas(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDespesasTipo('reais')}
                        className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors shadow-sm ${
                          despesasTipo === 'reais'
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >R$</button>
                      <button
                        type="button"
                        onClick={() => setDespesasTipo('percentual')}
                        className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors shadow-sm ${
                          despesasTipo === 'percentual'
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >%</button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {despesasTipo === 'reais'
                      ? 'Valor fixo em reais somado ao total de cada índice'
                      : 'Percentual sobre valor atualizado + juros + multa de cada índice (ex.: honorários advocatícios)'}
                  </p>
                </div>
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                  💡 Os encargos serão aplicados a <strong>cada índice</strong> e comparados no resultado abaixo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Seleção: Índices oficiais */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <label className="block text-sm font-semibold text-gray-700">
              Selecione abaixo os índices a comparar
              <span className="text-gray-400 font-normal ml-1">
                ({totalSelecionado} selecionado{totalSelecionado === 1 ? '' : 's'})
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selecionarTodos}
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setSelecionados(new Set())}
                className="inline-flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
              >
                Limpar Seleção
              </button>
              <button
                type="button"
                onClick={limpar}
                title="Limpar valor, datas, seleção e dados salvos no navegador"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
              >
                <Trash2 className="w-3 h-3" />
                Limpar Tudo
              </button>
            </div>
          </div>

          {/* Índices oficiais */}
          <div className="mb-3">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Índices oficiais</p>
            <div className="flex flex-wrap gap-2">
              {TODOS_INDICES.map((indice) => {
                const ativo = selecionados.has(indice)
                return (
                  <button
                    key={indice}
                    type="button"
                    onClick={() => toggleSelecao(indice)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      ativo
                        ? 'bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    {ativo && <span className="text-[10px]">✓</span>}
                    {indice}
                    <span className={`hidden sm:inline text-[10px] font-normal ${ativo ? 'text-emerald-100' : 'text-emerald-500'}`}>
                      {INDICE_LABEL[indice].split(' — ')[1]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cestas (só aparece se tiver) */}
          {cestas.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Minhas cestas</p>
              <div className="flex flex-wrap gap-2">
                {cestas.map((c) => {
                  const key = `cesta:${c.id}`
                  const ativo = selecionados.has(key)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelecao(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        ativo
                          ? 'bg-slate-700 border-slate-700 text-white hover:bg-slate-800'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {ativo && <span className="text-[10px]">✓</span>}
                      <span>📁</span>
                      {c.nome}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {erro && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>
        )}

        <button
          onClick={() => buscar()}
          disabled={loading || totalSelecionado === 0}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:scale-100 text-white font-bold py-3 rounded-xl transition-all hover:scale-105"
        >
          {loading
            ? `Consultando ${totalSelecionado} ite${totalSelecionado === 1 ? 'm' : 'ns'}...`
            : `Comparar ${totalSelecionado > 0 ? `${totalSelecionado} ite${totalSelecionado === 1 ? 'm' : 'ns'}` : 'itens'} →`}
        </button>
      </div>

      {/* Banner de aviso — dados ainda não publicados */}
      {aviso && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800 mb-2">
                Índice ainda não publicado para {fmtMesCurto(aviso.mesSolicitado)}
              </p>
              <p className="text-sm text-amber-700 mb-2">
                Os seguintes índices ainda não foram publicados para o período solicitado:
              </p>
              <ul className="text-sm text-amber-800 mb-3 space-y-1 pl-2">
                {aviso.indicesIncompletos.map((ix) => (
                  <li key={ix.label} className="flex items-baseline gap-2">
                    <span className="text-amber-500">•</span>
                    <span>
                      <strong>{ix.label}</strong> — último valor publicado em <strong>{fmtMesCurto(ix.ultimoMes)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-amber-700 mb-4">
                Para uma comparação justa entre todos os índices, deseja recalcular usando até{' '}
                <strong>{fmtMesCurto(aviso.ultimoMesComum)}</strong> (último mês com dados em todos os índices selecionados)?
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={recalcularComMesesDisponiveis}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm"
                >
                  Recalcular até {fmtMesCurto(aviso.ultimoMesComum)} →
                </button>
                <button
                  onClick={() => setAviso(null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm"
                >
                  Manter resultado atual
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
            <p className="text-sm text-gray-500">Calculando comparação...</p>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="space-y-4">

          {/* Cards dos itens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {ordenados.map((r, i) => {
              const cor = corDoItem(r)
              const isMelhor = i === 0 && !r.erro
              const labelCurto = r.tipo === 'cesta'
                ? r.label
                : (r.id in INDICE_LABEL ? r.id : r.label)
              return (
                <div key={r.id} className={`relative rounded-2xl border-2 p-5 flex flex-col gap-2 ${cor.bg} ${cor.borda}`}>
                  {isMelhor && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        🏆 Maior rendimento
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-full truncate ${cor.badge}`} title={r.label}>
                      {r.tipo === 'cesta' && '📁 '}{labelCurto}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">{r.periodos ?? 0} meses</span>
                  </div>

                  {r.erro ? (
                    <p className="text-xs text-gray-400 mt-2">{r.erro}</p>
                  ) : modoSomenteIndices ? (
                    <>
                      <p className={`text-2xl font-black mt-1 leading-tight ${cor.texto}`}>{pct(r.variacao!)}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Variação no período
                      </p>
                      <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-1">
                        Fator: <span className="font-mono font-semibold text-gray-700">{fmtFator(r.fator!)}</span>
                      </p>
                    </>
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
                      {encargosPorItem[r.id] && (
                        <div className="border-t border-gray-200 pt-2 mt-1 space-y-0.5">
                          {encargosPorItem[r.id].jurosMora > 0 && (
                            <p className="text-[11px] text-gray-500 flex justify-between">
                              <span>+ Juros mora</span>
                              <span className="font-mono text-orange-600">{moeda(encargosPorItem[r.id].jurosMora)}</span>
                            </p>
                          )}
                          {encargosPorItem[r.id].multa > 0 && (
                            <p className="text-[11px] text-gray-500 flex justify-between">
                              <span>+ Multa</span>
                              <span className="font-mono text-orange-600">{moeda(encargosPorItem[r.id].multa)}</span>
                            </p>
                          )}
                          {encargosPorItem[r.id].despesas > 0 && (
                            <p className="text-[11px] text-gray-500 flex justify-between">
                              <span>+ Despesas</span>
                              <span className="font-mono text-orange-600">{moeda(encargosPorItem[r.id].despesas)}</span>
                            </p>
                          )}
                          <p className="text-xs font-bold text-emerald-800 flex justify-between border-t border-emerald-200 pt-1 mt-1">
                            <span>Total devido</span>
                            <span className="font-mono">{moeda(encargosPorItem[r.id].total)}</span>
                          </p>
                        </div>
                      )}
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
                {modoSomenteIndices
                  ? 'Variação dos índices no período · Ordenado por maior rendimento'
                  : `Valor original: ${moeda(resultado.valor_original)} · Ordenado por maior rendimento`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-6 py-3 text-left font-semibold">Item</th>
                    <th className="px-6 py-3 text-left font-semibold hidden sm:table-cell">Descrição</th>
                    <th className="px-6 py-3 text-right font-semibold">Variação</th>
                    <th className="px-6 py-3 text-right font-semibold">Fator</th>
                    {!modoSomenteIndices && (
                      <>
                        <th className="px-6 py-3 text-right font-semibold">Valor Corrigido (R$)</th>
                        <th className="px-6 py-3 text-right font-semibold">Ganho (R$)</th>
                        {temEncargosAplicados && (
                          <th className="px-6 py-3 text-right font-semibold">Total Devido (R$)</th>
                        )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((r, i) => {
                    const cor = corDoItem(r)
                    const labelCurto = r.tipo === 'cesta' ? r.label : r.id
                    const enc = encargosPorItem[r.id]
                    const colSpanErro = modoSomenteIndices ? 2 : (temEncargosAplicados ? 5 : 4)
                    return (
                      <tr key={r.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold text-white px-2 py-0.5 rounded whitespace-nowrap ${cor.badge}`}>
                            {r.tipo === 'cesta' && '📁 '}{labelCurto}
                          </span>
                          {i === 0 && !r.erro && <span className="ml-2 text-xs">🏆</span>}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.tipo === 'cesta' ? 'Cesta personalizada' : r.label}</td>
                        {r.erro ? (
                          <td colSpan={colSpanErro} className="px-6 py-3 text-xs text-gray-400">{r.erro}</td>
                        ) : (
                          <>
                            <td className={`px-6 py-3 text-right font-mono font-semibold ${r.variacao! >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {pct(r.variacao!)}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-gray-600">{fmtFator(r.fator!)}</td>
                            {!modoSomenteIndices && (
                              <>
                                <td className="px-6 py-3 text-right font-mono font-bold text-gray-900">{moedaSemSimbolo(r.valorCorrigido!)}</td>
                                <td className="px-6 py-3 text-right font-mono font-semibold text-emerald-700">
                                  {moedaSemSimbolo(r.valorCorrigido! - resultado.valor_original)}
                                </td>
                                {temEncargosAplicados && (
                                  <td className="px-6 py-3 text-right font-mono font-black text-emerald-800">
                                    {enc ? moedaSemSimbolo(enc.total) : '—'}
                                  </td>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

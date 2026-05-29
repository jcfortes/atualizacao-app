'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { INDICE_LABEL, type Indice } from '@/lib/indices'
import { useStoredState, STORAGE_KEYS, limparParametrosArmazenados } from '@/lib/useStoredState'
import { calcularEncargos, parsePctBR, type ResultadoEncargos } from '@/lib/encargos'
import { Trash2, GitCompare, ChevronDown, ChevronUp, Plus } from 'lucide-react'

interface CestaResumo {
  id: string
  nome: string
}

const BotaoExportarPDF = dynamic(
  () => import('./LaudoPDF').then((m) => m.BotaoExportarPDF),
  { ssr: false }
)

import { gerarExcelAtualizacao } from '@/lib/exportExcel'

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// 'YYYY-MM' → 'mai/2026'
function fmtMesCurto(yyyymm: string): string {
  if (!yyyymm) return ''
  const [a, m] = yyyymm.split('-').map(Number)
  if (!a || !m || m < 1 || m > 12) return yyyymm
  return `${MESES_PT[m - 1]}/${a}`
}

// Soma N meses ao 'YYYY-MM'
function somarMeses(yyyymm: string, n: number): string {
  const [a, m] = yyyymm.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

// Meses entre dois 'YYYY-MM' inclusive
function mesesEntre(inicio: string, fim: string): number {
  const [ai, mi] = inicio.split('-').map(Number)
  const [af, mf] = fim.split('-').map(Number)
  if (!ai || !mi || !af || !mf) return 0
  return (af * 12 + mf) - (ai * 12 + mi) + 1
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

// Input com máscara dinâmica (somente dígitos → formata 2 casas decimais em pt-BR)
// Usa-se para % (juros, multa, %despesas) e também R$ menor (despesas em R$)
function NumericInput({
  value, onChange, placeholder, suffix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) { onChange(''); return }
    const num = parseInt(digits, 10) / 100
    onChange(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? '0,00'}
        value={value}
        onChange={handleChange}
        className={`w-full border border-gray-300 rounded-lg ${suffix ? 'pr-10' : 'pr-3'} pl-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">{suffix}</span>
      )}
    </div>
  )
}

export function Calculadora() {
  // Estes campos persistem em localStorage (compartilhados com Comparativo)
  const [valor, setValor] = useStoredState<string>(STORAGE_KEYS.valor, '')
  const [inicio, setInicio] = useStoredState<string>(STORAGE_KEYS.inicio, '')
  const [fim, setFim] = useStoredState<string>(STORAGE_KEYS.fim, '')
  // selecao = 'IPCA' | 'IGPM' | ... | 'cesta:UUID'
  const [selecao, setSelecao] = useStoredState<string>(STORAGE_KEYS.indiceCalc, 'IPCA')
  // Encargos (opcionais)
  const [jurosMora, setJurosMora] = useStoredState<string>(STORAGE_KEYS.jurosMora, '')
  const [multa, setMulta] = useStoredState<string>(STORAGE_KEYS.multa, '')
  const [despesas, setDespesas] = useStoredState<string>(STORAGE_KEYS.despesas, '')
  const [despesasTipo, setDespesasTipo] = useStoredState<'reais' | 'percentual'>(STORAGE_KEYS.despesasTipo, 'reais')
  const [encargosAbertos, setEncargosAbertos] = useState(false)
  const [cestas, setCestas] = useState<CestaResumo[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  // Carrega cestas do usuário
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
        // silencioso — calculadora ainda funciona com índices oficiais
      })
  }, [])

  const isCesta = selecao.startsWith('cesta:')
  const cestaId = isCesta ? selecao.slice(6) : null
  const indice: Indice = (isCesta ? 'IPCA' : selecao) as Indice
  const cestaSelecionada = isCesta ? cestas.find((c) => c.id === cestaId) : null
  const nomeExibicao = cestaSelecionada ? cestaSelecionada.nome : indice
  const descricaoExibicao = cestaSelecionada ? `Cesta: ${cestaSelecionada.nome}` : INDICE_LABEL[indice]

  function mesParaBCB(mes: string, ultimo = false) {
    if (!mes) return ''
    const [ano, m] = mes.split('-')
    if (ultimo) {
      const ultimoDia = new Date(parseInt(ano), parseInt(m), 0).getDate()
      return `${String(ultimoDia).padStart(2, '0')}/${m}/${ano}`
    }
    return `01/${m}/${ano}`
  }

  function limpar() {
    setValor('')
    setInicio('')
    setFim('')
    setSelecao('IPCA')
    setJurosMora('')
    setMulta('')
    setDespesas('')
    setDespesasTipo('reais')
    setEncargosAbertos(false)
    setResultado(null)
    setErro('')
    limparParametrosArmazenados()
  }

  // Auto-cálculo: quando usuário preenche encargos (especialmente despesas em %) e os
  // campos básicos estão prontos, dispara automaticamente o calcular() pra mostrar o
  // valor R$ equivalente imediatamente, sem precisar clicar em "Calcular correção".
  useEffect(() => {
    const numValor = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (!numValor || !inicio || !fim) return
    if (inicio >= fim) return
    const j = parsePctBR(jurosMora)
    const m = parsePctBR(multa)
    const d = parsePctBR(despesas)
    const temEncargo = j > 0 || m > 0 || d > 0
    if (!temEncargo) return
    if (resultado || loading) return
    // Debounce 500ms para não disparar a cada tecla
    const t = setTimeout(() => { calcular() }, 500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, inicio, fim, jurosMora, multa, despesas, despesasTipo])

  // Calcula os encargos se houver resultado + algum encargo informado
  const encargos: ResultadoEncargos | null = (() => {
    if (!resultado) return null
    const j = parsePctBR(jurosMora)
    const m = parsePctBR(multa)
    const d = parsePctBR(despesas)
    if (j <= 0 && m <= 0 && d <= 0) return null
    return calcularEncargos({
      valorAtualizado: resultado.valor_corrigido,
      meses: resultado.periodos,
      jurosMoraPct: j,
      multaPct: m,
      despesas: d,
      despesasTipo,
    })
  })()

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
      })
      if (isCesta && cestaId) {
        params.set('cesta', cestaId)
      } else {
        params.set('indice', indice)
      }
      const res = await fetch(`/api/corrigir?${params}`)
      const txt = await res.text()
      if (!txt.trim().startsWith('{')) {
        throw new Error(`Resposta inválida do servidor (${res.status})`)
      }
      const data = JSON.parse(txt)
      if (data.error) { setErro(data.error); return }
      setResultado(data)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao conectar com a API. Tente novamente.')
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Índice de correção
              {cestaSelecionada && (
                <span className="ml-2 text-xs font-normal text-emerald-600">
                  ⓘ usando sua cesta personalizada
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={selecao}
                onChange={(e) => setSelecao(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition cursor-pointer"
              >
                <optgroup label="Índices oficiais">
                  {indices.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </optgroup>
                {cestas.length > 0 && (
                  <optgroup label="Minhas cestas">
                    {cestas.map((c) => (
                      <option key={c.id} value={`cesta:${c.id}`}>
                        {c.nome}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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

          {/* Encargos (opcional) — colapsável */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Juros de mora (% a.m.)</label>
                    <NumericInput value={jurosMora} onChange={setJurosMora} placeholder="0,00" suffix="%" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Multa (%)</label>
                    <NumericInput value={multa} onChange={setMulta} placeholder="0,00" suffix="%" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Outras despesas</label>
                  <div className="flex gap-2">
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDespesasTipo('reais')}
                        className={`px-3 rounded-md text-xs font-bold border transition-colors ${
                          despesasTipo === 'reais'
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >R$</button>
                      <button
                        type="button"
                        onClick={() => setDespesasTipo('percentual')}
                        className={`px-3 rounded-md text-xs font-bold border transition-colors ${
                          despesasTipo === 'percentual'
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                            : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >%</button>
                    </div>
                    {despesasTipo === 'percentual' ? (
                      <>
                        <div className="w-24 shrink-0">
                          <NumericInput value={despesas} onChange={setDespesas} placeholder="0,00" suffix="%" />
                        </div>
                        <div className="flex-1 flex items-center px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm font-mono font-semibold text-emerald-800 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-600/70 mr-2 font-bold">=</span>
                          {encargos
                            ? moeda(encargos.despesas)
                            : loading
                              ? 'calculando...'
                              : (
                                <span className="text-[11px] font-normal text-emerald-700/70">
                                  preencha valor e período →
                                </span>
                              )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1">
                        <NumericInput value={despesas} onChange={setDespesas} placeholder="0,00" suffix="R$" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {despesasTipo === 'reais'
                      ? 'Valor fixo em reais somado ao total'
                      : 'Percentual sobre valor atualizado + juros + multa (ex.: honorários advocatícios)'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{erro}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={calcular}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? 'Calculando...' : 'Calcular correção →'}
            </button>
            <button
              type="button"
              onClick={limpar}
              disabled={loading}
              title="Limpar todos os campos e dados salvos no navegador"
              className="flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all text-sm shadow-sm disabled:opacity-50 disabled:hover:bg-gray-900"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            💡 Valor, período e índice ficam salvos no seu navegador (válido por 7 dias) e disponíveis no Comparativo. Limpos automaticamente ao sair.
          </p>
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
                <p className="text-sm text-gray-500">Consultando {nomeExibicao} no Banco Central...</p>
              </div>
            </div>
          )}

          {resultado && (() => {
            const mesesEsperados = mesesEntre(inicio, fim)
            const ultimoMesDisponivel = somarMeses(inicio, resultado.periodos - 1)
            const dadosParciais = resultado.periodos > 0 && resultado.periodos < mesesEsperados
            return (
            <div className="space-y-4 h-full flex flex-col">
              {/* Aviso de dados parciais */}
              {dadosParciais && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div className="flex-1">
                      <p className="font-bold text-amber-800 text-sm mb-1">
                        {nomeExibicao} ainda não foi publicado para {fmtMesCurto(fim)}
                      </p>
                      <p className="text-xs text-amber-700">
                        O último valor disponível é de <strong>{fmtMesCurto(ultimoMesDisponivel)}</strong>.
                        O cálculo abaixo usa o período de <strong>{fmtMesCurto(inicio)}</strong> até{' '}
                        <strong>{fmtMesCurto(ultimoMesDisponivel)}</strong> ({resultado.periodos} {resultado.periodos === 1 ? 'mês' : 'meses'}).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Valor corrigido */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-6">
                <p className="text-sm text-emerald-700 font-semibold mb-1">Valor corrigido</p>
                <p className="text-4xl font-black text-emerald-800">{moeda(resultado.valor_corrigido)}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Variação: <strong>{pct(resultado.variacao_pct)}</strong> · Fator: <strong>{fmtFator(resultado.fator)}</strong>
                </p>
              </div>

              {/* Demonstrativo de composição (quando há encargos) */}
              {encargos && (
                <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Demonstrativo de composição</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor original</span>
                      <span className="font-mono text-gray-700">{moeda(resultado.valor_original)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor atualizado ({nomeExibicao})</span>
                      <span className="font-mono text-gray-900 font-semibold">{moeda(encargos.valorAtualizado)}</span>
                    </div>
                    {encargos.jurosMora > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Juros de mora <span className="text-xs text-gray-400">({encargos.jurosMoraPct.toFixed(2).replace('.', ',')}% a.m. × {encargos.meses} {encargos.meses === 1 ? 'mês' : 'meses'})</span>
                        </span>
                        <span className="font-mono text-orange-600 font-semibold">+ {moeda(encargos.jurosMora)}</span>
                      </div>
                    )}
                    {encargos.multa > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Multa <span className="text-xs text-gray-400">({encargos.multaPct.toFixed(2).replace('.', ',')}%)</span>
                        </span>
                        <span className="font-mono text-orange-600 font-semibold">+ {moeda(encargos.multa)}</span>
                      </div>
                    )}
                    {encargos.despesas > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          Outras despesas{' '}
                          {encargos.despesasTipo === 'percentual' && (
                            <span className="text-xs text-gray-400">({encargos.despesasEntrada.toFixed(2).replace('.', ',')}%)</span>
                          )}
                        </span>
                        <span className="font-mono text-orange-600 font-semibold">+ {moeda(encargos.despesas)}</span>
                      </div>
                    )}
                    <div className="border-t border-emerald-200 pt-2 mt-2 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Total devido</span>
                      <span className="font-mono text-2xl font-black text-emerald-800">{moeda(encargos.total)}</span>
                    </div>
                  </div>
                </div>
              )}

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
                  <p className="text-xs text-gray-500 mb-1">{cestaSelecionada ? 'Cesta' : 'Índice'}</p>
                  <p className="font-bold text-gray-900 truncate" title={nomeExibicao}>{nomeExibicao}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Períodos</p>
                  <p className="font-bold text-gray-900">{resultado.periodos} meses</p>
                </div>
              </div>
            </div>
            )
          })()}
        </div>
      </div>

      {/* ── Planilha de atualização em largura total ── */}
      {resultado && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">Planilha de atualização — {nomeExibicao}</p>
              <p className="text-xs text-gray-400 mt-0.5">{resultado.periodos} meses · {descricaoExibicao}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/comparativo?preselect=${encodeURIComponent(selecao)}`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-all shadow-sm"
                title="Compare este cálculo com outros índices, sem perder os dados informados"
              >
                <GitCompare className="w-4 h-4" />
                Comparar com outros índices
              </Link>
              <BotaoExportarPDF resultado={resultado} indice={indice} inicio={inicio} fim={fim} labelCustom={cestaSelecionada?.nome} encargos={encargos} />
              <BotaoExportarExcel resultado={resultado} indice={indice} inicio={inicio} fim={fim} labelCustom={cestaSelecionada?.nome} encargos={encargos} />
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-900 text-white">
                  <th className="px-6 py-3 text-left font-semibold">Mês</th>
                  <th className="px-6 py-3 text-right font-semibold">Taxa (%)</th>
                  <th className="px-6 py-3 text-right font-semibold">Fator Mensal</th>
                  <th className="px-6 py-3 text-right font-semibold">Fator Acumulado</th>
                  <th className="px-6 py-3 text-right font-semibold">Valor Corrigido (R$)</th>
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
                    {moedaSemSimbolo(resultado.valor_original)}
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
                      {moedaSemSimbolo(linha.valorCorrigido)}
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
                  <td className="px-6 py-3 text-right font-mono font-bold text-emerald-400">{moedaSemSimbolo(resultado.valor_corrigido)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Botão Exportar Excel ──────────────────────────────────────────────────────

interface ExcelProps {
  resultado: Resultado
  indice: Indice
  inicio: string
  fim: string
  labelCustom?: string
  encargos?: ResultadoEncargos | null
}

function BotaoExportarExcel({ resultado, indice, inicio, fim, labelCustom, encargos }: ExcelProps) {
  const [loading, setLoading] = useState(false)

  async function exportar() {
    setLoading(true)
    try {
      const blob = await gerarExcelAtualizacao(resultado, indice, inicio, fim, labelCustom, encargos)
      const [ai, mi] = inicio.split('-')
      const [af, mf] = fim.split('-')
      const slug = labelCustom ? labelCustom.replace(/[^a-z0-9]/gi, '_') : indice
      const nome = `Planilha_${slug}_${mi}-${ai}_${mf}-${af}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={exportar}
      disabled={loading}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-sm disabled:opacity-50 disabled:hover:bg-emerald-600"
    >
      <span>📊</span>
      {loading ? 'Gerando...' : 'Exportar Excel'}
    </button>
  )
}

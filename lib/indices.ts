// Códigos das séries no BCB (Banco Central do Brasil)
// Tipos:
//   taxa_mensal: valor já é a variação % do mês (multiplica fatores)
//   valor_absoluto: valor é R$ ou número absoluto (calcula fator final/inicial)

export const SERIES = {
  // Inflação
  IPCA:     433,    // % a.m. — Inflação oficial (IBGE)
  IGPM:     189,    // % a.m. — Inflação FGV
  IGPDI:    190,    // % a.m. — IGP-DI FGV (disponibilidade interna)
  INPC:     188,    // % a.m. — Inflação popular (IBGE)
  INCC:     192,    // % a.m. — INCC-M FGV (construção civil)
  // Juros e renda fixa
  CDI:      4391,   // % a.m. — CDI acumulado no mês
  SELIC:    4390,   // % a.m. — SELIC acumulada no mês
  TR:       7811,   // % a.m. — Taxa Referencial mensal
  POUPANCA: 196,    // % a.m. — Poupança nova (pós 04/05/2012)
  FGTS:     -1,     // % a.m. — TR + 0,2466% a.m. (calculado, não vem do BCB direto)
  // Outros
  USD:      3698,   // R$ — Dólar PTAX venda (média mensal)
  SM:       1619,   // R$ — Salário mínimo nominal mensal
} as const

export type Indice = keyof typeof SERIES

export type TipoIndice = 'taxa_mensal' | 'valor_absoluto'

export const TIPO: Record<Indice, TipoIndice> = {
  IPCA:     'taxa_mensal',
  IGPM:     'taxa_mensal',
  IGPDI:    'taxa_mensal',
  INPC:     'taxa_mensal',
  INCC:     'taxa_mensal',
  CDI:      'taxa_mensal',
  SELIC:    'taxa_mensal',
  TR:       'taxa_mensal',
  POUPANCA: 'taxa_mensal',
  FGTS:     'taxa_mensal',
  USD:      'valor_absoluto',
  SM:       'valor_absoluto',
}

export const INDICE_LABEL: Record<Indice, string> = {
  IPCA:     'IPCA — Inflação oficial',
  IGPM:     'IGP-M — Inflação FGV',
  IGPDI:    'IGP-DI — Disponibilidade interna FGV',
  INPC:     'INPC — Inflação popular',
  INCC:     'INCC-M — Custo da construção',
  CDI:      'CDI — Taxa interbancária',
  SELIC:    'SELIC — Taxa básica',
  TR:       'TR — Taxa Referencial',
  POUPANCA: 'Poupança — Rendimento mensal (nova)',
  FGTS:     'FGTS — TR + 3% a.a.',
  USD:      'Dólar — Cotação PTAX (R$)',
  SM:       'Salário Mínimo (R$)',
}

export interface DadoBCB {
  data: string   // DD/MM/AAAA
  valor: string  // taxa mensal em % (taxa_mensal) OU valor absoluto em R$ (valor_absoluto)
}

// FGTS = TR + 3% a.a. capitalizado mensalmente
// (1.03)^(1/12) - 1 = 0.00246627 → 0,2466% a.m.
const FGTS_BONUS_MENSAL = 0.246627

// Busca dados do BCB entre duas datas (dataInicio e dataFim no formato DD/MM/AAAA)
export async function buscarIndice(
  indice: Indice,
  dataInicio: string,
  dataFim: string,
  cache: RequestCache = 'no-store'
): Promise<DadoBCB[]> {
  // FGTS é derivado da TR (BCB não tem série direta do FGTS)
  if (indice === 'FGTS') {
    const tr = await buscarIndice('TR', dataInicio, dataFim, cache)
    return tr.map((d) => ({
      data: d.data,
      valor: (parseFloat(d.valor.replace(',', '.')) + FGTS_BONUS_MENSAL).toFixed(6).replace('.', ','),
    }))
  }
  const codigo = SERIES[indice]
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`
  const res = await fetch(url, { cache, headers: { Accept: 'application/json' } })
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(`O Banco Central está temporariamente indisponível (HTTP ${res.status}). Tente novamente em alguns instantes.`)
    }
    if (res.status === 404) {
      throw new Error(`Sem dados publicados para ${indice} no período informado.`)
    }
    throw new Error(`Erro ao consultar ${indice} no BCB (HTTP ${res.status}).`)
  }
  const texto = await res.text()
  if (!texto.trim().startsWith('[') && !texto.trim().startsWith('{')) {
    throw new Error(`O Banco Central retornou resposta inválida para ${indice}. Tente novamente em alguns instantes.`)
  }
  let data: unknown
  try {
    data = JSON.parse(texto)
  } catch {
    throw new Error(`Resposta corrompida do BCB para ${indice}.`)
  }
  if (!Array.isArray(data)) throw new Error(`Resposta inválida para ${indice}`)
  return data as DadoBCB[]
}

// Busca a série histórica completa — usado na página de histórico
// Sempre passa range de datas porque o BCB retorna 406 pra séries grandes sem range.
// Faz parse robusto da resposta (BCB às vezes retorna XML em vez de JSON sob carga).
export async function buscarSerieCompleta(
  indice: Indice,
  cache: RequestCache | { revalidate: number } = 'no-store'
): Promise<DadoBCB[]> {
  if (indice === 'FGTS') {
    const tr = await buscarSerieCompleta('TR', cache)
    return tr.map((d) => ({
      data: d.data,
      valor: (parseFloat(d.valor.replace(',', '.')) + FGTS_BONUS_MENSAL).toFixed(6).replace('.', ','),
    }))
  }
  const codigo = SERIES[indice]
  const hoje = new Date()
  const dd = String(hoje.getDate()).padStart(2, '0')
  const mm = String(hoje.getMonth() + 1).padStart(2, '0')
  const aaaa = hoje.getFullYear()
  const dataInicial = '01/01/1980'
  const dataFinal = `${dd}/${mm}/${aaaa}`
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`
  const opts: RequestInit = typeof cache === 'string'
    ? { cache, headers: { Accept: 'application/json' } }
    : { next: cache, headers: { Accept: 'application/json' } }
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(`Erro ao buscar ${indice}: HTTP ${res.status}`)
  // Lê como texto primeiro pra ter chance de detectar HTML/XML retornados por erro do BCB
  const texto = await res.text()
  if (!texto.trim().startsWith('[') && !texto.trim().startsWith('{')) {
    throw new Error(`BCB retornou resposta não-JSON para ${indice} (provável instabilidade). Tente novamente em alguns segundos.`)
  }
  let data: unknown
  try {
    data = JSON.parse(texto)
  } catch {
    throw new Error(`Resposta inválida do BCB para ${indice}`)
  }
  if (!Array.isArray(data)) throw new Error(`Resposta inválida para ${indice}`)
  return data as DadoBCB[]
}

// Calcula fator a partir de taxas mensais (% a.m.) — usado em índices de inflação/juros
export function calcularFator(dados: DadoBCB[]): number {
  return dados.reduce((fator, d) => {
    const taxa = parseFloat(d.valor.replace(',', '.')) / 100
    return fator * (1 + taxa)
  }, 1)
}

// Calcula fator a partir de valores absolutos (R$) — usado em Dólar, Salário Mínimo etc.
// Fator = valor_final / valor_inicial
export function calcularFatorAbsoluto(dados: DadoBCB[]): number {
  if (dados.length < 2) return 1
  const primeiro = parseFloat(dados[0].valor.replace(',', '.'))
  const ultimo = parseFloat(dados[dados.length - 1].valor.replace(',', '.'))
  if (!primeiro) return 1
  return ultimo / primeiro
}

// Helper inteligente que escolhe o cálculo correto baseado no tipo do índice
export function calcularFatorIndice(indice: Indice, dados: DadoBCB[]): number {
  return TIPO[indice] === 'valor_absoluto'
    ? calcularFatorAbsoluto(dados)
    : calcularFator(dados)
}

// Converte uma série de valores absolutos em série de taxas mensais implícitas (%)
// Útil pra exibir tabela de cálculo de forma uniforme entre os dois tipos.
// Primeira linha vira 0% (não há mês anterior para comparar).
export function valoresParaTaxas(dados: DadoBCB[]): DadoBCB[] {
  if (dados.length === 0) return []
  return dados.map((d, i) => {
    if (i === 0) return { data: d.data, valor: '0' }
    const anterior = parseFloat(dados[i - 1].valor.replace(',', '.'))
    const atual = parseFloat(d.valor.replace(',', '.'))
    if (!anterior) return { data: d.data, valor: '0' }
    const taxa = (atual / anterior - 1) * 100
    return { data: d.data, valor: taxa.toFixed(6).replace('.', ',') }
  })
}

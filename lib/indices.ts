// Códigos das séries no BCB (Banco Central do Brasil)
// CDI: 4391 = CDI acumulado no mês (% a.m.) — mensal
// SELIC: 4390 = SELIC acumulada no mês (% a.m.) — mensal
// (séries 12 e 11 são diárias e retornariam centenas de registros)
export const SERIES = {
  IPCA:  433,
  IGPM:  189,
  INPC:  188,
  CDI:   4391,
  SELIC: 4390,
} as const

export type Indice = keyof typeof SERIES

export const INDICE_LABEL: Record<Indice, string> = {
  IPCA: 'IPCA — Inflação oficial',
  IGPM: 'IGP-M — Inflação FGV',
  INPC: 'INPC — Inflação popular',
  CDI: 'CDI — Taxa interbancária',
  SELIC: 'SELIC — Taxa básica',
}

export interface DadoBCB {
  data: string   // DD/MM/AAAA
  valor: string  // taxa mensal em %
}

// Busca dados do BCB entre duas datas (dataInicio e dataFim no formato DD/MM/AAAA)
export async function buscarIndice(
  indice: Indice,
  dataInicio: string,
  dataFim: string
): Promise<DadoBCB[]> {
  const codigo = SERIES[indice]
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Erro ao buscar ${indice}: ${res.status}`)
  return res.json()
}

// Calcula fator de correção a partir de uma lista de taxas mensais (em %)
export function calcularFator(dados: DadoBCB[]): number {
  return dados.reduce((fator, d) => {
    const taxa = parseFloat(d.valor.replace(',', '.')) / 100
    return fator * (1 + taxa)
  }, 1)
}

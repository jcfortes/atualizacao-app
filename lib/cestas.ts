import { type Indice, buscarIndice, TIPO, INDICE_LABEL, type DadoBCB } from './indices'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface ComposicaoItem {
  indice: Indice
  peso: number // 0..1 (soma de todos deve ser 1)
}

export interface Cesta {
  id: string
  user_id: string
  nome: string
  descricao: string | null
  composicao: ComposicaoItem[]
  created_at: string
  updated_at: string
}

export type CestaInput = {
  nome: string
  descricao?: string | null
  composicao: ComposicaoItem[]
}

// Apenas índices de taxa_mensal podem entrar em uma cesta (mistura % com R$ não faz sentido)
export const INDICES_PERMITIDOS_CESTA: Indice[] = [
  'IPCA', 'IGPM', 'IGPDI', 'INPC', 'INCC',
  'CDI', 'SELIC', 'TR', 'POUPANCA', 'FGTS',
]

// ── Validação ──────────────────────────────────────────────────────────────

export function validarCesta(input: CestaInput): string | null {
  if (!input.nome?.trim()) return 'Nome da cesta é obrigatório'
  if (input.nome.length > 80) return 'Nome muito longo (máx 80 caracteres)'
  if (!input.composicao || input.composicao.length < 2) {
    return 'A cesta precisa de pelo menos 2 índices'
  }
  if (input.composicao.length > 10) {
    return 'Máximo de 10 índices na cesta'
  }
  for (const item of input.composicao) {
    if (!INDICES_PERMITIDOS_CESTA.includes(item.indice)) {
      return `Índice "${item.indice}" não é permitido em cestas (só índices em % a.m.)`
    }
    if (item.peso < 0 || item.peso > 1) {
      return `Peso inválido para ${item.indice}`
    }
  }
  // Soma dos pesos deve ser 1 (tolerância 0,01)
  const soma = input.composicao.reduce((s, c) => s + c.peso, 0)
  if (Math.abs(soma - 1) > 0.01) {
    return `Os pesos devem somar 100% (atualmente: ${(soma * 100).toFixed(1)}%)`
  }
  // Sem índices duplicados
  const set = new Set(input.composicao.map((c) => c.indice))
  if (set.size !== input.composicao.length) {
    return 'Existem índices duplicados na composição'
  }
  return null
}

// ── Cálculo: gera série mensal da cesta a partir das séries dos componentes ─

export interface DadoCesta {
  data: string
  valor: string // taxa mensal % composta
}

/**
 * Recebe as séries históricas de todos os índices da composição (do mais recente
 * pro mais antigo, formato BCB) e produz a série mensal da cesta:
 *   taxa_cesta_no_mês = soma(peso_i * taxa_i)
 *
 * Considera apenas as datas presentes em TODAS as séries.
 */
export function calcularSerieCesta(
  composicao: ComposicaoItem[],
  series: Record<Indice, DadoBCB[]>
): DadoCesta[] {
  // Cria um Map por índice: data → valor (taxa %)
  const maps: Record<string, Map<string, number>> = {}
  for (const item of composicao) {
    const m = new Map<string, number>()
    const serie = series[item.indice] || []
    for (const d of serie) {
      m.set(d.data, parseFloat(d.valor.replace(',', '.')))
    }
    maps[item.indice] = m
  }

  // Datas presentes em todas as séries
  const referenciaInicial = composicao[0]
  if (!referenciaInicial) return []
  const datasReferencia = [...maps[referenciaInicial.indice].keys()]

  const resultado: DadoCesta[] = []
  for (const data of datasReferencia) {
    let valorComposto = 0
    let temTudo = true
    for (const item of composicao) {
      const v = maps[item.indice].get(data)
      if (v === undefined || Number.isNaN(v)) {
        temTudo = false
        break
      }
      valorComposto += item.peso * v
    }
    if (temTudo) {
      resultado.push({
        data,
        valor: valorComposto.toFixed(6).replace('.', ','),
      })
    }
  }
  return resultado
}

// ── Helper: rótulo curto da cesta ──────────────────────────────────────────

export function rotuloCurtoComposicao(composicao: ComposicaoItem[]): string {
  return composicao
    .map((c) => `${(c.peso * 100).toFixed(0)}% ${c.indice}`)
    .join(' + ')
}

export function nomeIndiceCurto(indice: Indice): string {
  const labels: Record<Indice, string> = {
    IPCA: 'IPCA', IGPM: 'IGP-M', IGPDI: 'IGP-DI', INPC: 'INPC', INCC: 'INCC',
    CDI: 'CDI', SELIC: 'SELIC', TR: 'TR', POUPANCA: 'Poupança', FGTS: 'FGTS',
    USD: 'Dólar', SM: 'Salário Mínimo',
  }
  return labels[indice]
}

// Re-exporta pra acesso fácil
export { INDICE_LABEL, TIPO }

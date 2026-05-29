// ============================================================
// Cálculo de Encargos sobre valor atualizado
// ============================================================
// Aplica juros de mora, multa e outras despesas sobre o valor
// já atualizado pela inflação (ou outro índice).
//
// Convenção brasileira jurídica padrão:
// 1. Valor atualizado pela inflação:    VA = VO * fator
// 2. Juros de mora (SIMPLES) sobre VA:  J  = VA * (taxa_mes * n_meses)
// 3. Multa sobre VA:                    M  = VA * (multa% / 100)
// 4. Outras despesas:
//    - se R$: D = valor_fixo
//    - se %:  D = (VA + J + M) * (despesa% / 100)
//                 (% sobre o valor já atualizado+juros+multa)
// 5. Total = VA + J + M + D
// ============================================================

export type DespesasTipo = 'reais' | 'percentual'

export interface EntradaEncargos {
  valorAtualizado: number          // VA — valor após correção pelo índice
  meses: number                     // n — quantos meses entre data inicial e final
  jurosMoraPct: number              // taxa de juros de mora em % a.m. (ex: 1.0 = 1% a.m.)
  multaPct: number                  // multa em % (ex: 2.0 = 2%)
  despesas: number                  // valor numérico das outras despesas
  despesasTipo: DespesasTipo        // se "reais" ou "percentual" sobre VA+J+M
}

export interface ResultadoEncargos {
  valorAtualizado: number
  jurosMora: number
  multa: number
  despesas: number
  total: number
  // metadados pra exibição
  jurosMoraPct: number
  meses: number
  multaPct: number
  despesasTipo: DespesasTipo
  despesasEntrada: number           // valor original informado (antes de aplicar como % se for o caso)
  temEncargos: boolean              // ao menos um encargo > 0
}

export function calcularEncargos(e: EntradaEncargos): ResultadoEncargos {
  const VA = Math.max(0, e.valorAtualizado)
  const meses = Math.max(0, e.meses)

  // Juros simples
  const J = VA * (e.jurosMoraPct / 100) * meses

  // Multa
  const M = VA * (e.multaPct / 100)

  // Despesas
  let D = 0
  if (e.despesasTipo === 'reais') {
    D = Math.max(0, e.despesas)
  } else {
    // % sobre VA+J+M
    D = (VA + J + M) * (e.despesas / 100)
  }

  const total = VA + J + M + D

  const temEncargos = J > 0 || M > 0 || D > 0

  return {
    valorAtualizado: VA,
    jurosMora: J,
    multa: M,
    despesas: D,
    total,
    jurosMoraPct: e.jurosMoraPct,
    meses,
    multaPct: e.multaPct,
    despesasTipo: e.despesasTipo,
    despesasEntrada: e.despesas,
    temEncargos,
  }
}

// Helper pra parsear string brasileira "1,00" → 1.0
export function parsePctBR(s: string): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

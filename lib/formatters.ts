// Helpers de formatação monetária — padrão da plataforma Matemático.com.br
//
// Regra geral:
// - Em colunas de tabela/listagem, o header termina com "(R$)" e a célula
//   exibe apenas o número (sem o símbolo "R$"), com font-mono para alinhamento.
// - Em KPIs, cards, badges, totais isolados e tooltips, use o formato com símbolo.

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatarMoedaSemSimbolo(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

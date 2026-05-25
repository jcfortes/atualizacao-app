import { NextRequest, NextResponse } from 'next/server'
import { buscarIndice, calcularFator, type Indice, type DadoBCB } from '@/lib/indices'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const dataInicio = searchParams.get('inicio') ?? ''
  const dataFim = searchParams.get('fim') ?? ''
  const indice = (searchParams.get('indice') ?? 'IPCA') as Indice

  if (!valor || !dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  try {
    const dados = await buscarIndice(indice, dataInicio, dataFim)
    if (!dados.length) {
      return NextResponse.json({ error: 'Sem dados para o período informado' }, { status: 404 })
    }
    const fator = calcularFator(dados)
    const valorCorrigido = valor * fator
    const variacao = (fator - 1) * 100

    return NextResponse.json({
      valor_original: valor,
      valor_corrigido: valorCorrigido,
      fator,
      variacao_pct: variacao,
      periodos: dados.length,
      dados,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

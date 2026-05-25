import { NextRequest, NextResponse } from 'next/server'
import { buscarIndice, calcularFator, INDICE_LABEL, type Indice } from '@/lib/indices'

const INDICES: Indice[] = ['IPCA', 'IGPM', 'INPC', 'CDI', 'SELIC']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const dataInicio = searchParams.get('inicio') ?? ''
  const dataFim = searchParams.get('fim') ?? ''

  if (!valor || !dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const resultados = await Promise.all(
    INDICES.map(async (indice) => {
      try {
        const dados = await buscarIndice(indice, dataInicio, dataFim)
        if (!dados.length) return { indice, erro: 'Sem dados para o período' }
        const fator = calcularFator(dados)
        const valorCorrigido = valor * fator
        const variacao = (fator - 1) * 100
        return { indice, label: INDICE_LABEL[indice], fator, valorCorrigido, variacao, periodos: dados.length }
      } catch {
        return { indice, label: INDICE_LABEL[indice], erro: 'Indisponível' }
      }
    })
  )

  return NextResponse.json({ valor_original: valor, resultados })
}

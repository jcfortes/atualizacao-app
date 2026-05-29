import { NextResponse } from 'next/server'
import { SERIES, TIPO, INDICE_LABEL, buscarSerieCompleta, type Indice } from '@/lib/indices'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ indice: string }> }
) {
  const { indice } = await params
  const indiceKey = indice.toUpperCase() as Indice

  if (!(indiceKey in SERIES)) {
    return NextResponse.json({ error: 'Índice inválido' }, { status: 400 })
  }

  try {
    const dados = await buscarSerieCompleta(indiceKey, { revalidate: 3600 })

    // Ordena do mais recente pro mais antigo
    const ordenado = [...dados].reverse()

    return NextResponse.json({
      indice: indiceKey,
      label: INDICE_LABEL[indiceKey],
      tipo: TIPO[indiceKey],
      total: ordenado.length,
      dados: ordenado,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

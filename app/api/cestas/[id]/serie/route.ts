import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buscarSerieCompleta, type Indice, type DadoBCB } from '@/lib/indices'
import { calcularSerieCesta, type Cesta } from '@/lib/cestas'

// Retorna a série completa da cesta, no formato semelhante a /api/serie/[indice]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Busca a cesta no banco
  const { data: cesta, error: errCesta } = await supabase
    .from('cestas_indices')
    .select('*')
    .eq('id', id)
    .single<Cesta>()

  if (errCesta || !cesta) {
    return NextResponse.json({ error: 'Cesta não encontrada' }, { status: 404 })
  }

  try {
    // Busca série de cada índice da composição em paralelo (com cache de 1h)
    const indicesUnicos = cesta.composicao.map((c) => c.indice)
    const seriesArr = await Promise.all(
      indicesUnicos.map((idx) => buscarSerieCompleta(idx, { revalidate: 3600 }))
    )

    const series: Record<Indice, DadoBCB[]> = {} as Record<Indice, DadoBCB[]>
    indicesUnicos.forEach((idx, i) => {
      series[idx] = seriesArr[i]
    })

    // Calcula a série composta (do mais recente pro mais antigo, formato BCB → reverso)
    // As séries do BCB vêm cronológicas (antigo→novo). Calcula direto.
    const dadosCronologicos = calcularSerieCesta(cesta.composicao, series)

    // Inverte para ficar igual o padrão das outras APIs (recente→antigo)
    const dados = [...dadosCronologicos].reverse()

    return NextResponse.json({
      cesta: {
        id: cesta.id,
        nome: cesta.nome,
        descricao: cesta.descricao,
        composicao: cesta.composicao,
      },
      tipo: 'taxa_mensal',
      total: dados.length,
      dados,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

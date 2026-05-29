import { NextRequest, NextResponse } from 'next/server'
import {
  buscarIndice,
  calcularFator,
  calcularFatorIndice,
  valoresParaTaxas,
  TIPO,
  type Indice,
  type DadoBCB,
} from '@/lib/indices'
import { createClient } from '@/lib/supabase/server'
import { calcularSerieCesta, type Cesta } from '@/lib/cestas'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const dataInicio = searchParams.get('inicio') ?? ''
  const dataFim = searchParams.get('fim') ?? ''
  const indiceParam = searchParams.get('indice') ?? 'IPCA'
  const cestaId = searchParams.get('cesta') // opcional

  if (!valor || !dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  // ── Caminho: Cesta ────────────────────────────────────────────────────
  if (cestaId) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

      const { data: cesta, error: errCesta } = await supabase
        .from('cestas_indices')
        .select('*')
        .eq('id', cestaId)
        .single<Cesta>()

      if (errCesta || !cesta) {
        return NextResponse.json({ error: 'Cesta não encontrada' }, { status: 404 })
      }

      // Busca série de cada índice da composição no período pedido (paralelo)
      const indicesUnicos = cesta.composicao.map((c) => c.indice)
      const seriesArr = await Promise.all(
        indicesUnicos.map((idx) => buscarIndice(idx, dataInicio, dataFim))
      )
      const series: Record<Indice, DadoBCB[]> = {} as Record<Indice, DadoBCB[]>
      indicesUnicos.forEach((idx, i) => {
        series[idx] = seriesArr[i]
      })

      // Série da cesta (cronológico)
      const dadosCesta = calcularSerieCesta(cesta.composicao, series)
      if (!dadosCesta.length) {
        return NextResponse.json({ error: 'Sem dados para o período informado' }, { status: 404 })
      }

      const fator = calcularFator(dadosCesta)
      const valorCorrigido = valor * fator
      const variacao = (fator - 1) * 100

      return NextResponse.json({
        valor_original: valor,
        valor_corrigido: valorCorrigido,
        fator,
        variacao_pct: variacao,
        periodos: dadosCesta.length,
        dados: dadosCesta,
        tipo: 'taxa_mensal',
        cesta: { id: cesta.id, nome: cesta.nome, composicao: cesta.composicao },
      })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  // ── Caminho: Índice oficial ───────────────────────────────────────────
  const indice = indiceParam as Indice
  try {
    const dadosRaw = await buscarIndice(indice, dataInicio, dataFim)
    if (!dadosRaw.length) {
      return NextResponse.json({ error: 'Sem dados para o período informado' }, { status: 404 })
    }

    const fator = calcularFatorIndice(indice, dadosRaw)
    const valorCorrigido = valor * fator
    const variacao = (fator - 1) * 100

    const dados = TIPO[indice] === 'valor_absoluto'
      ? valoresParaTaxas(dadosRaw)
      : dadosRaw

    return NextResponse.json({
      valor_original: valor,
      valor_corrigido: valorCorrigido,
      fator,
      variacao_pct: variacao,
      periodos: dados.length,
      dados,
      tipo: TIPO[indice],
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

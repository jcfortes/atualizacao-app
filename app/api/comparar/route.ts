import { NextRequest, NextResponse } from 'next/server'
import { buscarIndice, calcularFator, calcularFatorIndice, INDICE_LABEL, type Indice, type DadoBCB } from '@/lib/indices'
import { createClient } from '@/lib/supabase/server'
import { calcularSerieCesta, type Cesta } from '@/lib/cestas'

const TODOS_INDICES: Indice[] = [
  'IPCA', 'IGPM', 'IGPDI', 'INPC', 'INCC',
  'CDI', 'SELIC', 'TR', 'POUPANCA', 'FGTS',
  'USD', 'SM',
]

interface ResultadoBase {
  id: string
  label: string
  tipo: 'indice' | 'cesta'
  fator?: number
  valorCorrigido?: number
  variacao?: number
  periodos?: number
  erro?: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const valor = parseFloat(searchParams.get('valor') ?? '0')
  const dataInicio = searchParams.get('inicio') ?? ''
  const dataFim = searchParams.get('fim') ?? ''

  const indicesParam = searchParams.get('indices')
  const cestasParam = searchParams.get('cestas')

  const indicesSolicitados: Indice[] = indicesParam
    ? (indicesParam.split(',').filter((i) => TODOS_INDICES.includes(i as Indice)) as Indice[])
    : []
  const cestasSolicitadas: string[] = cestasParam ? cestasParam.split(',').filter(Boolean) : []

  if (!valor || !dataInicio || !dataFim) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  if (indicesSolicitados.length === 0 && cestasSolicitadas.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um índice ou cesta' }, { status: 400 })
  }

  // ── Processa índices oficiais ───────────────────────────────────────────
  const resultadosIndices: ResultadoBase[] = await Promise.all(
    indicesSolicitados.map(async (indice) => {
      try {
        const dados = await buscarIndice(indice, dataInicio, dataFim)
        if (!dados.length) {
          return { id: indice, label: INDICE_LABEL[indice], tipo: 'indice', erro: 'Sem dados para o período' }
        }
        const fator = calcularFatorIndice(indice, dados)
        return {
          id: indice,
          label: INDICE_LABEL[indice],
          tipo: 'indice',
          fator,
          valorCorrigido: valor * fator,
          variacao: (fator - 1) * 100,
          periodos: dados.length,
        }
      } catch (e) {
        return { id: indice, label: INDICE_LABEL[indice], tipo: 'indice', erro: e instanceof Error ? e.message : 'Indisponível' }
      }
    })
  )

  // ── Processa cestas (precisa autenticação + buscar do banco) ────────────
  let resultadosCestas: ResultadoBase[] = []
  if (cestasSolicitadas.length > 0) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado para acessar cestas' }, { status: 401 })
    }

    const { data: cestasData } = await supabase
      .from('cestas_indices')
      .select('*')
      .in('id', cestasSolicitadas)

    resultadosCestas = await Promise.all(
      (cestasData ?? []).map(async (cesta: Cesta) => {
        try {
          const indicesUnicos = cesta.composicao.map((c) => c.indice)
          const seriesArr = await Promise.all(
            indicesUnicos.map((idx) => buscarIndice(idx, dataInicio, dataFim))
          )
          const series: Record<Indice, DadoBCB[]> = {} as Record<Indice, DadoBCB[]>
          indicesUnicos.forEach((idx, i) => {
            series[idx] = seriesArr[i]
          })
          const dadosCesta = calcularSerieCesta(cesta.composicao, series)
          if (!dadosCesta.length) {
            return { id: `cesta:${cesta.id}`, label: cesta.nome, tipo: 'cesta', erro: 'Sem dados para o período' }
          }
          const fator = calcularFator(dadosCesta)
          return {
            id: `cesta:${cesta.id}`,
            label: cesta.nome,
            tipo: 'cesta',
            fator,
            valorCorrigido: valor * fator,
            variacao: (fator - 1) * 100,
            periodos: dadosCesta.length,
          }
        } catch (e) {
          return { id: `cesta:${cesta.id}`, label: cesta.nome, tipo: 'cesta', erro: e instanceof Error ? e.message : 'Indisponível' }
        }
      })
    )
  }

  return NextResponse.json({
    valor_original: valor,
    resultados: [...resultadosIndices, ...resultadosCestas],
  })
}

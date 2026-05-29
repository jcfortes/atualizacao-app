import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Cesta, rotuloCurtoComposicao } from '@/lib/cestas'
import { CestaCliente } from './CestaCliente'

export default async function CestaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cesta, error } = await supabase
    .from('cestas_indices')
    .select('*')
    .eq('id', id)
    .single<Cesta>()

  if (error || !cesta) notFound()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Cesta personalizada · Sua composição
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{cesta.nome}</h1>
        {cesta.descricao && (
          <p className="text-gray-500 text-sm mt-1">{cesta.descricao}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Composição: <span className="font-mono">{rotuloCurtoComposicao(cesta.composicao)}</span>
        </p>
      </div>

      <CestaCliente cesta={cesta} />
    </div>
  )
}

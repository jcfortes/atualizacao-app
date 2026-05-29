import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Cesta } from '@/lib/cestas'
import { EditorCesta } from '../../EditorCesta'

export default async function EditarCestaPage({
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
          Editando cesta
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Editar <span className="text-emerald-600">{cesta.nome}</span>
        </h1>
      </div>
      <EditorCesta cestaExistente={cesta} />
    </div>
  )
}

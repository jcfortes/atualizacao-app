import { notFound } from 'next/navigation'
import { SERIES, INDICE_LABEL, TIPO, type Indice } from '@/lib/indices'
import { HistoricoTabela } from './HistoricoTabela'
import { SobreIndice } from './SobreIndice'

export default async function IndicePage({
  params,
}: {
  params: Promise<{ indice: string }>
}) {
  const { indice } = await params
  const indiceKey = indice.toUpperCase() as Indice

  if (!SERIES[indiceKey]) notFound()

  const tipo = TIPO[indiceKey]
  const label = INDICE_LABEL[indiceKey]
  const unidade = tipo === 'valor_absoluto' ? 'R$' : '% a.m.'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Histórico completo · BCB
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{label}</h1>
        <p className="text-gray-500 text-sm mt-1">
          Série histórica completa publicada pelo Banco Central do Brasil. Valores em <strong>{unidade}</strong>, do mais recente para o mais antigo.
        </p>
      </div>

      <div className="mb-4">
        <SobreIndice indice={indiceKey} />
      </div>

      <HistoricoTabela indice={indiceKey} tipo={tipo} />
    </div>
  )
}

export function generateStaticParams() {
  return Object.keys(SERIES).map((indice) => ({ indice: indice.toLowerCase() }))
}

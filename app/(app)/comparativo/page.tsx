import { Suspense } from 'react'
import { Comparativo } from '@/app/Comparativo'

export default function ComparativoPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Compare múltiplos índices no mesmo período
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Comparar <span className="text-emerald-600">Índices</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Veja qual índice rendeu mais no período. Sem valor: mostra só variações. Com valor: aplica a correção ao seu valor.
        </p>
      </div>
      <Suspense fallback={null}>
        <Comparativo />
      </Suspense>
    </div>
  )
}

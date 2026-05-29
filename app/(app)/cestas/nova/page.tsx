import { EditorCesta } from '../EditorCesta'

export default function NovaCestaPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Compor um índice personalizado
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Nova <span className="text-emerald-600">Cesta de Índices</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Combine 2 ou mais índices oficiais (IPCA, IGP-M, etc.) com pesos personalizados pra criar um indexador composto.
          Exemplo: <strong>IPCA 40% + INCC 40% + Salário Mínimo 20%</strong> = "Índice de Custo do meu Negócio".
        </p>
      </div>
      <EditorCesta />
    </div>
  )
}

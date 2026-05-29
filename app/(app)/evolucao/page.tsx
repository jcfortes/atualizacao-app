import { EvolucaoCliente } from './EvolucaoCliente'

export default function EvolucaoPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Evolução histórica · Comparativo multi-índice
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Evolução dos <span className="text-emerald-600">Índices</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Compare a evolução acumulada de vários índices no mesmo gráfico ao longo do tempo. Valores normalizados em <strong>base 100</strong> no início do período pra permitir comparação visual entre escalas diferentes.
        </p>
      </div>
      <EvolucaoCliente />
    </div>
  )
}

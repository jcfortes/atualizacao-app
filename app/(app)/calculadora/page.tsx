import { Calculadora } from '@/app/Calculadora'

export default function CalculadoraPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Dados oficiais · Banco Central do Brasil
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          Calculadora de <span className="text-emerald-600">Correção</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Corrija valores usando 12 indexadores: IPCA, IGP-M, IGP-DI, INPC, INCC, CDI, SELIC, TR, Poupança, FGTS, Dólar e Salário Mínimo.
        </p>
      </div>
      <Calculadora />
    </div>
  )
}

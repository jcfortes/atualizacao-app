'use client'

import { useState } from 'react'
import { Calculadora } from './Calculadora'
import { Comparativo } from './Comparativo'

export default function Home() {
  const [aba, setAba] = useState<'calculadora' | 'comparativo'>('calculadora')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="https://matematico.com.br">
            <img src="/logo-matematico.png" alt="Matemático" className="h-8 w-auto" />
          </a>
          <div className="flex items-center gap-4">
            <a href="https://matematico.com.br" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Outros apps
            </a>
            <a
              href="https://amortizacao.matematico.com.br"
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              Amortização →
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-700 font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Dados oficiais · Banco Central do Brasil
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3">
            Atualização <span className="text-emerald-600">Monetária</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl">
            Corrija valores pela inflação usando IPCA, IGP-M, INPC, CDI ou SELIC.
            Dados diretos do Banco Central, sempre atualizados.
          </p>

          {/* Abas */}
          <div className="flex gap-2 mt-8">
            <button
              onClick={() => setAba('calculadora')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                aba === 'calculadora'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              📊 Calculadora
            </button>
            <button
              onClick={() => setAba('comparativo')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                aba === 'comparativo'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              ⚖️ Comparativo de Índices
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {aba === 'calculadora' ? <Calculadora /> : <Comparativo />}
      </div>

      {/* Rodapé */}
      <footer className="border-t border-gray-200 mt-12 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <img src="/logo-matematico.png" alt="Matemático" className="h-7 w-auto opacity-70" />
          <p>Dados: Banco Central do Brasil (BCB/SGS) · Atualização automática</p>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, ExternalLink, Home, Check } from 'lucide-react'

/**
 * AppSwitcher — botão tipo "grid de apps" do Google.
 * Permite trocar entre os sistemas da plataforma Matemático.com.br
 * sem precisar voltar pra landing.
 *
 * Padrão da plataforma — replicar em todos os apps internos.
 * Quando criar app novo: adicionar ao array APPS de cada repo
 * e marcar `atual: true` no próprio repo.
 */

interface AppItem {
  nome: string
  url: string
  emoji: string
  atual?: boolean
}

const APPS: AppItem[] = [
  { nome: 'Atualização Monetária', url: 'https://atualizacao.matematico.com.br', emoji: '📈', atual: true },
  { nome: 'Amortização e Financiamento', url: 'https://amortizacao.matematico.com.br', emoji: '📊' },
  { nome: 'Valuation Empresarial', url: 'https://avaliacao.matematico.com.br', emoji: '🏢' },
]

export function AppSwitcher() {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        className="p-2 rounded-md hover:bg-emerald-50 transition-colors text-emerald-700 hover:text-emerald-800"
        aria-label="Trocar de aplicativo"
        title="Trocar de aplicativo"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Plataforma Matemático
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Trocar de aplicativo</p>
          </div>

          <ul className="py-1">
            {APPS.map((app) => (
              <li key={app.url}>
                {app.atual ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 cursor-default">
                    <span className="text-xl shrink-0">{app.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-700 truncate">{app.nome}</p>
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Você está aqui
                      </p>
                    </div>
                  </div>
                ) : (
                  <a
                    href={app.url}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                    onClick={() => setAberto(false)}
                  >
                    <span className="text-xl shrink-0">{app.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 truncate">
                        {app.nome}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {app.url.replace('https://', '')}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t bg-slate-50">
            <a
              href="https://matematico.com.br"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/40 transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Página inicial da plataforma
              <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

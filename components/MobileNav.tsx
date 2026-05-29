'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator, Scale, TrendingUp, LineChart, LogOut, Menu, X, FolderHeart, Plus, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Indice } from '@/lib/indices'
import { limparParametrosArmazenados } from '@/lib/useStoredState'

const INDICES_ORDEM: Indice[] = [
  'IPCA', 'IGPM', 'IGPDI', 'INPC', 'INCC',
  'CDI', 'SELIC', 'TR', 'POUPANCA', 'FGTS',
  'USD', 'SM',
]

const NOMES_CURTOS: Record<Indice, string> = {
  IPCA: 'IPCA',
  IGPM: 'IGP-M',
  IGPDI: 'IGP-DI',
  INPC: 'INPC',
  INCC: 'INCC',
  CDI: 'CDI',
  SELIC: 'SELIC',
  TR: 'TR',
  POUPANCA: 'Poupança',
  FGTS: 'FGTS',
  USD: 'Dólar',
  SM: 'Salário Mínimo',
}

interface Cesta {
  id: string
  nome: string
}

export function MobileNav({ cestas = [] }: { cestas?: Cesta[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  async function handleSair() {
    setOpen(false)
    // Limpa parâmetros salvos no navegador antes de deslogar (privacidade)
    limparParametrosArmazenados()
    const sb = createClient()
    await sb.auth.signOut()
    window.location.href = 'https://matematico.com.br'
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-gray-500 hover:text-gray-900"
        aria-label="Menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <a href="https://matematico.com.br" onClick={() => setOpen(false)}>
            <img src="/logo-matematico.png" alt="Matemático" className="h-14 w-auto" />
          </a>
          <button onClick={() => setOpen(false)} className="p-2 text-gray-500 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="mb-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
            Menu
          </div>
          <a
            href="https://matematico.com.br"
            className="flex items-center gap-3 rounded-md text-base font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Home className="w-4 h-4 shrink-0" />
            Página Inicial
          </a>
          <MobileLink
            href="/calculadora"
            pathname={pathname}
            icon={<Calculator className="w-4 h-4 shrink-0" />}
            label="Calculadora"
            onClick={() => setOpen(false)}
          />
          <MobileLink
            href="/comparativo"
            pathname={pathname}
            icon={<Scale className="w-4 h-4 shrink-0" />}
            label="Comparar Índices"
            onClick={() => setOpen(false)}
          />
          <MobileLink
            href="/evolucao"
            pathname={pathname}
            icon={<LineChart className="w-4 h-4 shrink-0" />}
            label="Evolução"
            onClick={() => setOpen(false)}
          />

          <div className="pt-4 mt-2">
            <div className="mb-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" />
              Histórico de Índices
            </div>
            {INDICES_ORDEM.map((idx) => (
              <MobileLink
                key={idx}
                href={`/indices/${idx}`}
                pathname={pathname}
                label={NOMES_CURTOS[idx]}
                indent
                onClick={() => setOpen(false)}
              />
            ))}
          </div>

          {/* Linha divisória leve antes das cestas */}
          <div className="border-t border-gray-200 my-4" />

          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
              <FolderHeart className="w-3.5 h-3.5" />
              Minhas Cestas
            </div>
            {cestas.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400 italic">Nenhuma cesta criada</p>
            ) : (
              cestas.map((c) => (
                <MobileLink
                  key={c.id}
                  href={`/cestas/${c.id}`}
                  pathname={pathname}
                  label={c.nome}
                  indent
                  onClick={() => setOpen(false)}
                />
              ))
            )}
            <Link
              href="/cestas/nova"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 pl-9 pr-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/cestas/nova'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Nova cesta
            </Link>
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={handleSair}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-base font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

function MobileLink({
  href,
  pathname,
  icon,
  label,
  indent,
  onClick,
}: {
  href: string
  pathname: string
  icon?: React.ReactNode
  label: string
  indent?: boolean
  onClick?: () => void
}) {
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md text-base font-medium transition-colors ${
        indent ? 'pl-9 pr-3 py-2 text-sm' : 'px-3 py-2.5'
      } ${
        isActive
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calculator, Scale, TrendingUp, LineChart, LogOut, FolderHeart, Plus, Home } from 'lucide-react'
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

export function Sidebar({ cestas = [] }: { cestas?: Cesta[] }) {
  const pathname = usePathname()

  async function handleSair() {
    // Limpa parâmetros salvos no navegador antes de deslogar (privacidade)
    limparParametrosArmazenados()
    const sb = createClient()
    await sb.auth.signOut()
    window.location.href = 'https://matematico.com.br'
  }

  return (
    <aside className="hidden lg:flex fixed top-[140px] bottom-0 left-0 w-60 bg-white border-r border-gray-200 flex-col z-30">
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="mb-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
          Menu
        </div>
        <a
          href="https://matematico.com.br"
          className="flex items-center gap-3 rounded-md text-base font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 transition-colors"
        >
          <Home className="w-4 h-4 shrink-0" />
          Página Inicial
        </a>
        <SidebarLink
          href="/calculadora"
          pathname={pathname}
          icon={<Calculator className="w-4 h-4 shrink-0" />}
          label="Calculadora"
        />
        <SidebarLink
          href="/comparativo"
          pathname={pathname}
          icon={<Scale className="w-4 h-4 shrink-0" />}
          label="Comparar Índices"
        />
        <SidebarLink
          href="/evolucao"
          pathname={pathname}
          icon={<LineChart className="w-4 h-4 shrink-0" />}
          label="Evolução"
        />

        <div className="pt-4 mt-2">
          <div className="mb-4 inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md">
            <TrendingUp className="w-3.5 h-3.5" />
            Histórico de Índices
          </div>
          {INDICES_ORDEM.map((idx) => (
            <SidebarLink
              key={idx}
              href={`/indices/${idx}`}
              pathname={pathname}
              label={NOMES_CURTOS[idx]}
              indent
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
              <SidebarLink
                key={c.id}
                href={`/cestas/${c.id}`}
                pathname={pathname}
                label={c.nome}
                indent
              />
            ))
          )}
          <Link
            href="/cestas/nova"
            className={`flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-base font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  pathname,
  icon,
  label,
  indent,
}: {
  href: string
  pathname: string
  icon?: React.ReactNode
  label: string
  indent?: boolean
}) {
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md text-base font-medium transition-colors ${
        indent ? 'pl-9 pr-3 py-1.5 text-sm' : 'px-3 py-2'
      } ${
        isActive
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : indent
            ? 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
            : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

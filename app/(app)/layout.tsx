import { Sidebar } from '@/components/Sidebar'
import { MobileNav } from '@/components/MobileNav'
import { AppSwitcher } from '@/components/AppSwitcher'
import { createClient } from '@/lib/supabase/server'

interface CestaResumo {
  id: string
  nome: string
}

async function buscarCestas(): Promise<CestaResumo[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('cestas_indices')
      .select('id, nome')
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cestas = await buscarCestas()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Linha 1: Logo (fixo) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-[96px]">
        <a href="https://matematico.com.br">
          <img
            src="/logo-matematico.png"
            alt="Matemático — Clareza Financeira"
            className="h-20 w-auto"
          />
        </a>
        <div className="flex items-center gap-2">
          <AppSwitcher />
          <MobileNav cestas={cestas} />
        </div>
      </header>

      {/* Linha 2: Nome do app (fixo) */}
      <div className="fixed top-[96px] left-0 right-0 z-40 bg-white border-b border-gray-100 h-[44px] flex items-center justify-center">
        <p className="text-sm sm:text-xl font-semibold uppercase tracking-wide sm:tracking-widest text-gray-600 whitespace-nowrap">
          Sistema de Atualização Monetária
        </p>
      </div>

      {/* Conteúdo: sidebar + main */}
      <div className="flex pt-[140px] min-h-screen">
        <Sidebar cestas={cestas} />
        <main className="flex-1 lg:ml-60 p-4 sm:p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}

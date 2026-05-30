import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { verificarPrazo } from '@/lib/prazo'
import { Clock, ExternalLink, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

/**
 * Página exibida quando o prazo de uso da plataforma expira.
 * Acessível via redirect do middleware. Se o usuário ainda tem prazo
 * válido, redireciona pro dashboard.
 */
export default async function PrazoExpiradoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Sem usuário, vai pro login
  if (!user) redirect('/login')

  // Busca prazo do profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('prazo_tipo, prazo_quantidade, prazo_inicio')
    .eq('id', user.id)
    .single()

  const v = verificarPrazo({
    prazo_tipo: profile?.prazo_tipo ?? null,
    prazo_quantidade: profile?.prazo_quantidade ?? null,
    prazo_inicio: profile?.prazo_inicio ?? null,
  })

  // Se NÃO está expirado, manda de volta pro app
  if (!v.expirado) redirect('/dashboard')

  // Dispara notificação pra admins (idempotente, ignora duplicados nas últimas 24h)
  // Fire-and-forget: não bloqueia a renderização da página
  fetch('https://matematico.com.br/api/notify/prazo-expirado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id }),
  }).catch((err) => console.error('[notify] falhou:', err))

  const diasAtrasados = v.diasRestantes !== null ? Math.abs(v.diasRestantes) : 0

  async function handleSair() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-5">
        <div className="mx-auto bg-amber-100 rounded-full p-4 w-20 h-20 flex items-center justify-center">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Seu prazo de uso expirou
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            O seu prazo de uso da <strong>Plataforma Matemático</strong> expirou
            {diasAtrasados > 0 && (
              <> há <strong>{diasAtrasados} {diasAtrasados === 1 ? 'dia' : 'dias'}</strong></>
            )}.
            <br />
            Entre em contato pelo formulário pra renovar seu acesso.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 border border-slate-200">
          Usuário: <strong className="text-slate-700">{user.email}</strong>
          {v.dataExpiracao && (
            <>
              <br />
              Expiração: <strong className="text-slate-700">{v.dataExpiracao.toLocaleDateString('pt-BR')}</strong>
            </>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="https://matematico.com.br/#contato"
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all w-full"
          >
            Entrar em contato
            <ExternalLink className="h-4 w-4" />
          </Link>

          <form action={handleSair}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da plataforma
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          Matemático · Clareza Financeira em Cálculos Profissionais
        </p>
      </div>
    </div>
  )
}

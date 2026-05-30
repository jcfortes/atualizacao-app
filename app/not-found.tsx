import Link from 'next/link'
import { Construction, ArrowLeft, MessageSquare } from 'lucide-react'

/**
 * Página exibida quando uma rota não existe (404).
 * Padronizada em todos os apps da plataforma: mensagem amigável
 * "em desenvolvimento" em vez do 404 genérico do Next.js.
 *
 * Se o usuário chegou aqui por clicar num item de menu, é porque
 * a funcionalidade ainda está sendo construída.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center space-y-5">
        <div className="mx-auto bg-amber-100 rounded-full p-4 w-20 h-20 flex items-center justify-center">
          <Construction className="h-10 w-10 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Em desenvolvimento
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Este recurso ainda está sendo construído. Em breve ele estará disponível!
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Se você chegou aqui por um link específico que esperava funcionar,
            entre em contato pra avisar.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-all w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o Dashboard
          </Link>

          <Link
            href="https://matematico.com.br/#contato"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full text-sm text-slate-500 hover:text-emerald-700 py-2 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Reportar ou sugerir
          </Link>
        </div>

        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          Matemático · Clareza Financeira em Cálculos Profissionais
        </p>
      </div>
    </div>
  )
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verificarPrazo } from '@/lib/prazo'

const cookieDomain = '.matematico.com.br'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain: cookieDomain })
          )
        },
      },
    }
  )

  // Usa getSession (leitura local do cookie) — mais confiável pra SSO entre subdomínios
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null

  const { pathname } = request.nextUrl

  // Rotas públicas — não precisam de autenticação
  const publicRoutes = ['/login', '/cadastro', '/recuperar-senha', '/resetar-senha']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Não autenticado tentando rota protegida → redirecionar para login na landing
  if (!user && !isPublicRoute) {
    const url = new URL('https://matematico.com.br/auth')
    url.searchParams.set('redirect', `https://atualizacao.matematico.com.br${pathname}`)
    return NextResponse.redirect(url)
  }

  // ── Verificação de prazo (só pra usuários autenticados em rotas protegidas) ──
  if (user && !isPublicRoute && pathname !== '/prazo-expirado') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('prazo_tipo, prazo_quantidade, prazo_inicio')
      .eq('id', user.id)
      .single()

    if (profile) {
      const v = verificarPrazo({
        prazo_tipo: profile.prazo_tipo ?? null,
        prazo_quantidade: profile.prazo_quantidade ?? null,
        prazo_inicio: profile.prazo_inicio ?? null,
      })

      if (v.expirado) {
        const url = request.nextUrl.clone()
        url.pathname = '/prazo-expirado'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

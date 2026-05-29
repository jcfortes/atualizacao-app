import { createBrowserClient } from '@supabase/ssr'

const cookieOptions = {
  domain: '.matematico.com.br',
  path: '/',
  sameSite: 'lax' as const,
  secure: true,
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions }
  )
}

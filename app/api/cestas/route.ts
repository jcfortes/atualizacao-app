import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validarCesta, type CestaInput } from '@/lib/cestas'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('cestas_indices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cestas: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let body: CestaInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const erro = validarCesta(body)
  if (erro) return NextResponse.json({ error: erro }, { status: 400 })

  const { data, error } = await supabase
    .from('cestas_indices')
    .insert({
      user_id: user.id,
      nome: body.nome.trim(),
      descricao: body.descricao?.trim() || null,
      composicao: body.composicao,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cesta: data })
}

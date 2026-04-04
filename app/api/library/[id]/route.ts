import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const parsed = z.object({ title: z.string().min(1).max(100) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Titre invalide' }, { status: 400 })

  const { error } = await supabase
    .from('quiz_library')
    .update({ title: parsed.data.title })
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { error } = await supabase
    .from('quiz_library')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

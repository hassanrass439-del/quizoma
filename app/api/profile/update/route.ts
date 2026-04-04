import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  avatar_id: z.string().min(1).optional(),
  pseudo: z.string().min(1).max(30).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    const { error } = await supabase
      .from('profiles')
      .update(parsed.data)
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error updating profile:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

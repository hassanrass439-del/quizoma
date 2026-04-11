import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/broadcast'

interface Params {
  params: Promise<{ code: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 })

    const { data: game } = await supabase
      .from('games')
      .select('id, host_id')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })

    // Notifier le joueur refusé
    await serverBroadcast(`game:${code}`, 'JOIN_REJECTED', { user_id })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error reject-player:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

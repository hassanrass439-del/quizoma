import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
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
      .select('id, host_id, status')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })
    if (game.status !== 'lobby') return NextResponse.json({ error: 'Partie déjà lancée' }, { status: 409 })

    // Vérifier la limite
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if ((count ?? 0) >= 7) {
      return NextResponse.json({ error: 'Partie complète (max 7)' }, { status: 409 })
    }

    // Ajouter le joueur via service client (bypass RLS)
    const serviceSupabase = createServiceClient()
    const { error: insertErr } = await serviceSupabase.from('game_players').upsert(
      { game_id: game.id, user_id },
      { onConflict: 'game_id,user_id' }
    )
    if (insertErr) {
      console.error('[accept-player] insert error:', insertErr)
      return NextResponse.json({ error: 'Erreur insertion joueur' }, { status: 500 })
    }

    // Notifier tout le monde
    await serverBroadcast(`game:${code}`, 'JOIN_ACCEPTED', { user_id })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error accept-player:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

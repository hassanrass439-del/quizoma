import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ code: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: game } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code)
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'La partie a déjà commencé' }, { status: 409 })
    }

    // Vérifier nombre de joueurs max (12)
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if ((count ?? 0) >= 12) {
      return NextResponse.json({ error: 'Partie complète (max 12 joueurs)' }, { status: 409 })
    }

    // Upsert pour éviter les doublons
    await supabase.from('game_players').upsert(
      { game_id: game.id, user_id: user.id },
      { onConflict: 'game_id,user_id' }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error joining game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

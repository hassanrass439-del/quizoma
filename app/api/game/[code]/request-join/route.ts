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

    const { data: game } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', code)
      .single()

    if (!game || game.status !== 'lobby') {
      return NextResponse.json({ error: 'Partie introuvable ou déjà lancée' }, { status: 404 })
    }

    // Vérifier si déjà dans la partie
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)
      .eq('user_id', user.id)

    if ((count ?? 0) > 0) {
      return NextResponse.json({ already_in: true })
    }

    // Récupérer le profil du joueur
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, pseudo, avatar_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    // Broadcast la demande au host
    await serverBroadcast(`game:${code}`, 'JOIN_REQUEST', {
      user_id: user.id,
      pseudo: profile.pseudo,
      avatar_id: profile.avatar_id,
    })

    return NextResponse.json({ ok: true, pending: true })
  } catch (err) {
    console.error('Error request-join:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

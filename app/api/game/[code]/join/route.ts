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
      .select('id, host_id, status')
      .eq('code', code)
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'La partie a déjà commencé' }, { status: 409 })
    }

    // Vérifier si déjà dans la partie
    const { count: alreadyIn } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)
      .eq('user_id', user.id)

    if ((alreadyIn ?? 0) > 0) {
      return NextResponse.json({ ok: true })
    }

    // Vérifier nombre de joueurs max
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if ((count ?? 0) >= 7) {
      return NextResponse.json({ error: 'Partie complète (max 7 joueurs)' }, { status: 409 })
    }

    // Ne PAS insérer — le joueur sera redirigé vers le lobby qui gère l'approbation
    // Retourner ok pour que le frontend redirige vers /lobby/{code}
    return NextResponse.json({ ok: true, needsApproval: true })
  } catch (err) {
    console.error('Error joining game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

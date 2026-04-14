import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
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

    const serviceSupabase = createServiceClient()

    const { data: game } = await serviceSupabase
      .from('games')
      .select('id, host_id, status, config')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })
    if (game.status === 'finished') return NextResponse.json({ error: 'Partie déjà terminée' }, { status: 409 })

    // Récupérer le classement actuel
    const { data: players } = await serviceSupabase
      .from('game_players')
      .select('user_id, score, profiles(*)')
      .eq('game_id', game.id)
      .order('score', { ascending: false })

    const finalRanking = (players ?? []).map((p, i) => ({
      player: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
      score: p.score,
      rank: i + 1,
    }))

    // Mettre à jour les stats
    for (const entry of finalRanking) {
      await serviceSupabase.rpc('update_player_stats', {
        p_user_id: entry.player?.id,
        p_score: entry.score,
      })
    }

    // Sauvegarder les indices des questions jouées dans le config
    const gameConfig = game.config as Record<string, unknown>
    const currentIndex = (gameConfig.current_question_index as number) ?? 0
    const playedIndices = Array.from({ length: currentIndex + 1 }, (_, i) => i)
    const previousPlayed = (gameConfig.played_question_indices as number[]) ?? []
    const allPlayed = [...new Set([...previousPlayed, ...playedIndices])]

    await serviceSupabase.from('games').update({
      status: 'finished',
      config: { ...gameConfig, played_question_indices: allPlayed },
    }).eq('id', game.id)
    await serverBroadcast(`game:${code}`, 'GAME_OVER', { final_ranking: finalRanking })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error stopping game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

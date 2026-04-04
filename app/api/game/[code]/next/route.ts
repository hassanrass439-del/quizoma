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

    const serviceSupabase = createServiceClient()

    const { data: game } = await serviceSupabase
      .from('games')
      .select('id, host_id, status, config')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })
    if (game.status !== 'reveal') {
      console.log('[next] 409 - status:', game.status)
      return NextResponse.json({ error: 'Phase incorrecte' }, { status: 409 })
    }

    const gameConfig = game.config as { nb_questions: number; timer_seconds: number; current_question_index?: number }
    const currentIndex = gameConfig.current_question_index ?? 0
    const nextIndex = currentIndex + 1
    console.log('[next] currentIndex:', currentIndex, '| nextIndex:', nextIndex, '| nb_questions:', gameConfig.nb_questions)
    const { count: qCount } = await serviceSupabase.from('questions').select('*', { count: 'exact', head: true }).eq('game_id', game.id)
    console.log('[next] questions in DB for this game:', qCount)

    if (nextIndex >= gameConfig.nb_questions) {
      // Fin de partie
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

      for (const entry of finalRanking) {
        await serviceSupabase.rpc('update_player_stats', {
          p_user_id: entry.player?.id,
          p_score: entry.score,
        })
      }

      await serviceSupabase.from('games').update({ status: 'finished' }).eq('id', game.id)
      await serverBroadcast(`game:${code}`, 'GAME_OVER', { final_ranking: finalRanking })
    } else {
      // Question suivante
      const { data: nextQuestion } = await serviceSupabase
        .from('questions')
        .select('*')
        .eq('game_id', game.id)
        .eq('index', nextIndex)
        .single()

      console.log('[next] nextQuestion:', nextQuestion?.id ?? 'NOT FOUND')
      if (!nextQuestion) {
        return NextResponse.json({ error: 'Question suivante non disponible (génération en cours)' }, { status: 202 })
      }

      const updatedConfig = { ...gameConfig, current_question_index: nextIndex }
      await serviceSupabase.from('games').update({ status: 'question', config: updatedConfig }).eq('id', game.id)
      await serverBroadcast(`game:${code}`, 'GAME_STATE_CHANGE', {
        status: 'question',
        question_index: nextIndex,
        question_data: nextQuestion,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error next question:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

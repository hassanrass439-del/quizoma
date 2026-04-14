import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/broadcast'
import { solveQCMQuestion } from '@/lib/ai/solveQCMQuestion'

export const maxDuration = 60

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

      // Sauvegarder les indices des questions jouées
      const playedIndices = Array.from({ length: nextIndex }, (_, i) => i)
      const previousPlayed = (gameConfig as Record<string, unknown>).played_question_indices as number[] ?? []
      const allPlayed = [...new Set([...previousPlayed, ...playedIndices])]

      await serviceSupabase.from('games').update({
        status: 'finished',
        config: { ...gameConfig, played_question_indices: allPlayed },
      }).eq('id', game.id)
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
        return NextResponse.json({ error: 'Question suivante non disponible' }, { status: 202 })
      }

      // Mode annales : résoudre la question si pas encore de réponse
      let solvedExtras: { vraie_reponse: string; explication: string } | null = null
      if (!nextQuestion.vraie_reponse) {
        try {
          const solved = await solveQCMQuestion(nextQuestion.question_text)
          await serviceSupabase
            .from('questions')
            .update({ vraie_reponse: solved.vraie_combinaison, explication: solved.explications })
            .eq('id', nextQuestion.id)
          solvedExtras = { vraie_reponse: solved.vraie_combinaison, explication: solved.explications }
          console.log('[next] QCM solved:', solved.vraie_combinaison)
        } catch (err) {
          console.error('[next] QCM solve error:', err)
        }
      }

      const broadcastQuestion = solvedExtras ? { ...nextQuestion, ...solvedExtras } : nextQuestion

      const updatedConfig = { ...gameConfig, current_question_index: nextIndex }
      await serviceSupabase.from('games').update({ status: 'question', config: updatedConfig }).eq('id', game.id)
      await serverBroadcast(`game:${code}`, 'GAME_STATE_CHANGE', {
        status: 'question',
        question_index: nextIndex,
        question_data: broadcastQuestion,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error next question:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

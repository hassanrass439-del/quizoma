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

    const gameConfig = game.config as { nb_questions: number; timer_seconds: number; current_question_index?: number }
    const currentIndex = gameConfig.current_question_index ?? 0

    if (game.status === 'question') {
      // Forcer le passage au vote — récupérer les bluffs déjà soumis
      const { data: currentQuestion } = await serviceSupabase
        .from('questions')
        .select('*')
        .eq('game_id', game.id)
        .eq('index', currentIndex)
        .single()

      if (!currentQuestion) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

      const { data: bluffs } = await serviceSupabase
        .from('player_bluffs')
        .select('id, bluff_text, player_id')
        .eq('question_id', currentQuestion.id)

      const allAnswers = [
        { id: 'correct', text: currentQuestion.vraie_reponse, player_id: null },
        ...(bluffs ?? []).map((b: { id: string; bluff_text: string; player_id: string }) => ({
          id: b.id,
          text: b.bluff_text,
          player_id: b.player_id,
        })),
      ]

      // Mélange
      for (let i = allAnswers.length - 1; i > 0; i--) {
        const arr = new Uint32Array(1)
        crypto.getRandomValues(arr)
        const j = arr[0] % (i + 1)
        ;[allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]]
      }

      await serviceSupabase.from('games').update({ status: 'voting' }).eq('id', game.id)
      await serverBroadcast(`game:${code}`, 'START_VOTE', { answers: allAnswers })

    } else if (game.status === 'voting') {
      // Forcer le passage au reveal
      const { data: currentQuestion } = await serviceSupabase
        .from('questions')
        .select('*')
        .eq('game_id', game.id)
        .eq('index', currentIndex)
        .single()

      if (!currentQuestion) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

      const { data: bluffs } = await serviceSupabase
        .from('player_bluffs')
        .select('id, bluff_text, player_id, profiles:player_id(pseudo, avatar_id)')
        .eq('question_id', currentQuestion.id)

      const { data: votes } = await serviceSupabase
        .from('player_votes')
        .select('player_id, answer_id, profiles:player_id(pseudo, avatar_id)')
        .eq('question_id', currentQuestion.id)

      // Calculer les scores
      const scores: Record<string, number> = {}
      for (const vote of votes ?? []) {
        if (vote.answer_id === 'correct') {
          scores[vote.player_id] = (scores[vote.player_id] ?? 0) + 1
        } else {
          const bluff = (bluffs ?? []).find((b: { id: string }) => b.id === vote.answer_id)
          if (bluff) {
            scores[bluff.player_id] = (scores[bluff.player_id] ?? 0) + 1
          }
        }
      }

      // Mettre à jour les scores des joueurs
      for (const [userId, delta] of Object.entries(scores)) {
        await serviceSupabase.rpc('increment_player_score', {
          p_game_id: game.id,
          p_user_id: userId,
          p_delta: delta,
        })
      }

      const bluffResults = (bluffs ?? []).map((b: { id: string; bluff_text: string; player_id: string; profiles: unknown }) => {
        const profile = (Array.isArray(b.profiles) ? b.profiles[0] : b.profiles) as { pseudo: string; avatar_id: string } | null
        const bluffVoters = (votes ?? [])
          .filter((v: { answer_id: string }) => v.answer_id === b.id)
          .map((v: { profiles: unknown }) => {
            const vp = (Array.isArray(v.profiles) ? v.profiles[0] : v.profiles) as { pseudo: string } | null
            return { pseudo: vp?.pseudo ?? '?' }
          })
        return {
          id: b.id,
          text: b.bluff_text,
          author: { pseudo: profile?.pseudo ?? '?' },
          voters: bluffVoters,
        }
      })

      await serviceSupabase.from('games').update({ status: 'reveal' }).eq('id', game.id)
      await serverBroadcast(`game:${code}`, 'REVEAL', {
        correct_answer: currentQuestion.vraie_reponse,
        explanation: currentQuestion.explication,
        bluffs: bluffResults,
        scores,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error force-next:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

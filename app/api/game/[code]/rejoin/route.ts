import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ code: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, status, config')
    .eq('code', code)
    .single()

  if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })

  const config = game.config as { current_question_index?: number }
  const currentIndex = config.current_question_index ?? 0

  const { data: currentQuestion } = await supabase
    .from('questions')
    .select('*')
    .eq('game_id', game.id)
    .eq('index', currentIndex)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {
    status: game.status,
    questionIndex: currentIndex,
    questionData: currentQuestion,
  }

  if (game.status === 'voting' && currentQuestion) {
    // Reconstruire les réponses pour le vote
    const { data: bluffs } = await supabase
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

    // Mélange déterministe basé sur question id
    for (let i = allAnswers.length - 1; i > 0; i--) {
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      const j = arr[0] % (i + 1)
      ;[allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]]
    }

    // Vérifier si le joueur a déjà voté
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('question_id', currentQuestion.id)
      .eq('voter_id', user.id)
      .maybeSingle()

    result.votePayload = { answers: allAnswers }
    result.hasVoted = !!existingVote
  }

  if (game.status === 'reveal' && currentQuestion) {
    // Reconstruire le reveal
    const { data: bluffs } = await supabase
      .from('player_bluffs')
      .select('id, bluff_text, player_id, profiles:player_id(pseudo, avatar_id)')
      .eq('question_id', currentQuestion.id)

    const { data: votes } = await supabase
      .from('votes')
      .select('voter_id, voted_for_bluff_id, is_correct, profiles:voter_id(pseudo, avatar_id)')
      .eq('question_id', currentQuestion.id)

    const scores: Record<string, number> = {}
    for (const vote of votes ?? []) {
      const v = vote as { voter_id: string; voted_for_bluff_id: string | null; is_correct: boolean }
      if (v.is_correct) {
        scores[v.voter_id] = (scores[v.voter_id] ?? 0) + 2
      }
    }
    for (const bluff of bluffs ?? []) {
      const b = bluff as { id: string; player_id: string }
      const votesForBluff = (votes ?? []).filter((v: { voted_for_bluff_id: string | null }) => v.voted_for_bluff_id === b.id)
      if (votesForBluff.length > 0) {
        scores[b.player_id] = (scores[b.player_id] ?? 0) + votesForBluff.length
      }
    }

    const bluffResults = (bluffs ?? []).map((b: { id: string; bluff_text: string; player_id: string; profiles: unknown }) => {
      const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
      const bluffVoters = (votes ?? [])
        .filter((v: { voted_for_bluff_id: string | null }) => v.voted_for_bluff_id === b.id)
        .map((v: { profiles: unknown }) => {
          const vp = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles
          return vp ?? { pseudo: '?' }
        })
      return {
        id: b.id,
        text: b.bluff_text,
        author: profile ?? { pseudo: '?' },
        voters: bluffVoters,
      }
    })

    result.revealPayload = {
      correct_answer: currentQuestion.vraie_reponse,
      bluffs: bluffResults,
      scores,
      explanation: currentQuestion.explication,
    }
  }

  // Bluffs déjà soumis par le joueur
  if (currentQuestion) {
    const { data: myBluff } = await supabase
      .from('player_bluffs')
      .select('id')
      .eq('question_id', currentQuestion.id)
      .eq('player_id', user.id)
      .maybeSingle()
    result.hasSubmittedBluff = !!myBluff
  }

  return NextResponse.json(result)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/broadcast'
import { z } from 'zod'

const schema = z.object({
  answer_id: z.string(),
})

interface Params {
  params: Promise<{ code: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params

  try {
    const t0 = Date.now()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.log('[vote] auth:', Date.now() - t0, 'ms')

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    const t1 = Date.now()
    const { data: game } = await supabase
      .from('games')
      .select('id, status, config')
      .eq('code', code)
      .single()
    console.log('[vote] fetch game:', Date.now() - t1, 'ms')

    if (!game || game.status !== 'voting') {
      console.log('[vote] 409 - game status:', game?.status, '| expected: voting')
      return NextResponse.json({ error: 'Phase incorrecte' }, { status: 409 })
    }

    const currentIndex = (game.config as { current_question_index?: number }).current_question_index ?? 0

    const t2 = Date.now()
    const { data: currentQuestion } = await supabase
      .from('questions')
      .select('*')
      .eq('game_id', game.id)
      .eq('index', currentIndex)
      .single()
    console.log('[vote] fetch question:', Date.now() - t2, 'ms')

    if (!currentQuestion) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

    const isCorrect = parsed.data.answer_id === 'correct'
    const bluffId = isCorrect ? null : parsed.data.answer_id

    // Vérifier que le bluff voté existe et que le joueur ne vote pas pour son propre bluff unique
    if (!isCorrect) {
      const { data: bluff } = await supabase
        .from('player_bluffs')
        .select('player_id, bluff_text')
        .eq('id', bluffId as string)
        .single()
      if (!bluff) {
        return NextResponse.json({ error: 'Vote invalide' }, { status: 400 })
      }
      // Vérifier si d'autres joueurs ont soumis le même texte (bluff partagé → autoriser)
      if (bluff.player_id === user.id) {
        const { count: sameTextCount } = await supabase
          .from('player_bluffs')
          .select('*', { count: 'exact', head: true })
          .eq('question_id', currentQuestion.id)
          .ilike('bluff_text', bluff.bluff_text)
        // Bluff unique → bloquer. Bluff partagé par d'autres → autoriser.
        if ((sameTextCount ?? 0) <= 1) {
          return NextResponse.json({ error: 'Vote invalide' }, { status: 400 })
        }
      }
    }

    const t3 = Date.now()
    await supabase.from('votes').upsert(
      {
        question_id: currentQuestion.id,
        voter_id: user.id,
        voted_for_bluff_id: bluffId,
        is_correct: isCorrect,
      },
      { onConflict: 'question_id,voter_id' }
    )

    console.log('[vote] upsert vote:', Date.now() - t3, 'ms')

    const t4 = Date.now()
    // Vérifier si tous ont voté (en parallèle)
    const [{ count: playerCount }, { count: voteCount }] = await Promise.all([
      supabase.from('game_players').select('*', { count: 'exact', head: true }).eq('game_id', game.id),
      supabase.from('votes').select('*', { count: 'exact', head: true }).eq('question_id', currentQuestion.id),
    ])

    console.log('[vote] count checks:', Date.now() - t4, 'ms')
    console.log('[vote] voteCount:', voteCount, '| playerCount:', playerCount)
    if ((voteCount ?? 0) >= (playerCount ?? 0)) {
      const t5 = Date.now()
      console.log('[vote] all voted → triggerRevealPhase')
      const serviceSupabase = createServiceClient()
      await triggerRevealPhase(serviceSupabase, game.id, code, currentQuestion)
      console.log('[vote] triggerRevealPhase:', Date.now() - t5, 'ms')
    }
    console.log('[vote] TOTAL:', Date.now() - t0, 'ms')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error voting:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerRevealPhase(supabase: any, gameId: string, code: string, question: any) {
  const r0 = Date.now()
  // Fetch bluffs + votes en parallèle
  const [{ data: bluffs }, { data: votes }] = await Promise.all([
    supabase.from('player_bluffs').select('id, bluff_text, player_id, profiles(pseudo, avatar_id)').eq('question_id', question.id),
    supabase.from('votes').select('voter_id, voted_for_bluff_id, is_correct, profiles(pseudo, avatar_id)').eq('question_id', question.id),
  ])
  console.log('[reveal] fetch bluffs+votes:', Date.now() - r0, 'ms')

  // Calculer les scores
  const scoreUpdates: Record<string, number> = {}

  for (const vote of votes ?? []) {
    // +2 pts pour la bonne réponse
    if (vote.is_correct) {
      scoreUpdates[vote.voter_id] = (scoreUpdates[vote.voter_id] ?? 0) + 2
    }
  }

  // Grouper les bluffs par texte (insensible à la casse) pour identifier les bluffs partagés
  const bluffsByText = new Map<string, Array<{ id: string; player_id: string }>>()
  for (const bluff of bluffs ?? []) {
    const b = bluff as { id: string; bluff_text: string; player_id: string }
    const key = b.bluff_text.trim().toLowerCase()
    if (!bluffsByText.has(key)) bluffsByText.set(key, [])
    bluffsByText.get(key)!.push({ id: b.id, player_id: b.player_id })
  }

  for (const bluff of bluffs ?? []) {
    const b = bluff as { id: string; bluff_text: string; player_id: string }
    const votesForBluff = (votes ?? []).filter((v: { voted_for_bluff_id: string }) => v.voted_for_bluff_id === b.id)
    if (votesForBluff.length > 0) {
      // Donner les points à TOUS les auteurs du même texte
      const key = b.bluff_text.trim().toLowerCase()
      const allAuthors = bluffsByText.get(key) ?? [{ id: b.id, player_id: b.player_id }]
      for (const author of allAuthors) {
        scoreUpdates[author.player_id] = (scoreUpdates[author.player_id] ?? 0) + votesForBluff.length
      }
    }
  }

  // Mettre à jour les scores en base
  const r2 = Date.now()
  for (const [userId, points] of Object.entries(scoreUpdates)) {
    await supabase.rpc('increment_player_score', {
      p_game_id: gameId,
      p_user_id: userId,
      p_points: points,
    })
  }
  console.log('[reveal] update scores:', Date.now() - r2, 'ms, players:', Object.keys(scoreUpdates).length)

  // Construire le payload de révélation
  const bluffsWithVoters = (bluffs ?? []).map((b: {
    id: string;
    bluff_text: string;
    player_id: string;
    profiles: { pseudo: string; avatar_id: string } | Array<{ pseudo: string; avatar_id: string }>
  }) => ({
    id: b.id,
    text: b.bluff_text,
    author: Array.isArray(b.profiles) ? b.profiles[0] : b.profiles,
    voters: (votes ?? [])
      .filter((v: { voted_for_bluff_id: string }) => v.voted_for_bluff_id === b.id)
      .map((v: { profiles: unknown }) => (Array.isArray(v.profiles) ? v.profiles[0] : v.profiles)),
  }))

  const r3 = Date.now()
  await supabase.from('games').update({ status: 'reveal' }).eq('id', gameId)
  console.log('[reveal] update game status:', Date.now() - r3, 'ms')

  const r4 = Date.now()
  await serverBroadcast(`game:${code}`, 'REVEAL', {
    correct_answer: question.vraie_reponse,
    bluffs: bluffsWithVoters,
    scores: scoreUpdates,
    explanation: question.explication,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { serverBroadcast } from '@/lib/supabase/broadcast'
import { isCorrectAnswer } from '@/lib/ai/antiCheat'
import { z } from 'zod'

const schema = z.object({
  bluff: z.string().min(1).max(200),
})

interface Params {
  params: Promise<{ code: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    const { data: game } = await supabase
      .from('games')
      .select('id, mode, status, config')
      .eq('code', code)
      .single()

    if (!game || game.status !== 'question') {
      console.log('[submit-bluff] 409 - game status:', game?.status, '| expected: question')
      return NextResponse.json({ error: 'Phase incorrecte' }, { status: 409 })
    }

    const currentIndex = (game.config as { current_question_index?: number }).current_question_index ?? 0

    // Trouver la question actuelle par son index courant
    const { data: currentQuestion } = await supabase
      .from('questions')
      .select('*')
      .eq('game_id', game.id)
      .eq('index', currentIndex)
      .single()

    if (!currentQuestion) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

    // Anti-triche côté serveur
    const mode = game.mode === 'bluff' ? 1 : 2
    const isCheat = isCorrectAnswer(parsed.data.bluff, mode, {
      vraie_reponse: currentQuestion.vraie_reponse,
      synonymes: (currentQuestion.synonymes as string[]) ?? [],
    })

    if (isCheat) {
      return NextResponse.json({ error: 'Bluff invalide : c\'est la bonne réponse' }, { status: 400 })
    }

    await supabase.from('player_bluffs').upsert(
      {
        question_id: currentQuestion.id,
        player_id: user.id,
        bluff_text: parsed.data.bluff,
      },
      { onConflict: 'question_id,player_id' }
    )

    // Vérifier si tous les joueurs ont soumis
    const { count: playerCount } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    const { count: bluffCount } = await supabase
      .from('player_bluffs')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', currentQuestion.id)

    console.log('[submit-bluff] bluffCount:', bluffCount, '| playerCount:', playerCount)
    console.log('[submit-bluff] SERVICE_ROLE_KEY set?', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    if ((bluffCount ?? 0) >= (playerCount ?? 0)) {
      console.log('[submit-bluff] all submitted → triggerVotePhase')
      const serviceSupabase = createServiceClient()
      await triggerVotePhase(serviceSupabase, game.id, code, currentQuestion)
      console.log('[submit-bluff] triggerVotePhase done')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error submitting bluff:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerVotePhase(supabase: any, gameId: string, code: string, question: any) {
  // Récupérer tous les bluffs
  const { data: bluffs } = await supabase
    .from('player_bluffs')
    .select('id, bluff_text, player_id')
    .eq('question_id', question.id)

  // Construire les réponses (vraie + bluffs) mélangées
  const allAnswers = [
    { id: 'correct', text: question.vraie_reponse, player_id: null },
    ...(bluffs ?? []).map((b: { id: string; bluff_text: string; player_id: string }) => ({
      id: b.id,
      text: b.bluff_text,
      player_id: b.player_id,
    })),
  ]

  // Mélange cryptographique
  for (let i = allAnswers.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    const j = arr[0] % (i + 1)
    ;[allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]]
  }

  console.log('[triggerVotePhase] gameId:', gameId)
  const { data: gameCheck, error: checkErr } = await supabase.from('games').select('id, status').eq('id', gameId).single()
  console.log('[triggerVotePhase] gameCheck:', gameCheck, '| checkErr:', checkErr)

  const { data: updateData, error: updateErr } = await supabase.from('games').update({ status: 'voting' }).eq('id', gameId).select('id, status')
  console.log('[triggerVotePhase] games update error:', updateErr)
  console.log('[triggerVotePhase] rows updated:', updateData)
  await serverBroadcast(`game:${code}`, 'START_VOTE', { answers: allAnswers })
}

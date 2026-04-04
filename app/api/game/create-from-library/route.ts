import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateGameCode } from '@/lib/utils/generateCode'
import { z } from 'zod'

const schema = z.object({
  quiz_id: z.string().uuid(),
  config: z.object({
    nb_questions: z.number().int().min(1).max(50),
    timer_seconds: z.number().int().min(10).max(120),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    const { quiz_id, config } = parsed.data

    // Fetch quiz + questions
    const { data: quiz } = await supabase
      .from('quiz_library')
      .select('*')
      .eq('id', quiz_id)
      .eq('owner_id', user.id)
      .single()

    if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 })

    const { data: savedQuestions } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz_id)
      .order('index', { ascending: true })
      .limit(config.nb_questions)

    if (!savedQuestions || savedQuestions.length === 0) {
      return NextResponse.json({ error: "Ce quiz n'a pas de questions sauvegardées" }, { status: 400 })
    }

    // Generate unique code
    let code = generateGameCode()
    let attempts = 0
    while (attempts < 5) {
      const { data } = await supabase.from('games').select('id').eq('code', code).single()
      if (!data) break
      code = generateGameCode()
      attempts++
    }

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        host_id: user.id,
        mode: quiz.mode,
        status: 'lobby',
        config: {
          nb_questions: Math.min(config.nb_questions, savedQuestions.length),
          timer_seconds: config.timer_seconds,
        },
      })
      .select()
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Erreur création partie' }, { status: 500 })
    }

    // Add host as player
    await supabase.from('game_players').insert({ game_id: game.id, user_id: user.id })

    // Copy questions from quiz_questions to questions
    const questionsToInsert = savedQuestions.slice(0, config.nb_questions).map((q, i) => ({
      game_id: game.id,
      index: i,
      question_text: q.question_text,
      vraie_reponse: q.vraie_reponse,
      synonymes: q.synonymes,
      explication: q.explication,
    }))

    await supabase.from('questions').insert(questionsToInsert)

    // Update play_count and last_played_at
    await supabase
      .from('quiz_library')
      .update({
        play_count: (quiz.play_count ?? 0) + 1,
        last_played_at: new Date().toISOString(),
      })
      .eq('id', quiz_id)

    return NextResponse.json({ code })
  } catch (err) {
    console.error('Error creating from library:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

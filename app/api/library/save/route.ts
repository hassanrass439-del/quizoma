import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  game_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  subject: z.string().max(50).nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    const { game_id, title, subject } = parsed.data

    // Fetch game to verify ownership and get mode
    const { data: game } = await supabase
      .from('games')
      .select('id, mode, host_id, config')
      .eq('id', game_id)
      .single()

    if (!game || game.host_id !== user.id) {
      return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    }

    // Fetch questions
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('game_id', game_id)
      .order('index', { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'Aucune question à sauvegarder' }, { status: 400 })
    }

    const serviceSupabase = createServiceClient()

    // Insert into quiz_library
    const { data: quiz, error: quizError } = await serviceSupabase
      .from('quiz_library')
      .insert({
        owner_id: user.id,
        title,
        subject: subject ?? null,
        mode: game.mode,
        total_questions: questions.length,
        play_count: 1,
        last_played_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
    }

    // Insert questions into quiz_questions
    await serviceSupabase.from('quiz_questions').insert(
      questions.map((q) => ({
        quiz_id: quiz.id,
        index: q.index,
        question_text: q.question_text,
        vraie_reponse: q.vraie_reponse,
        synonymes: q.synonymes,
        explication: q.explication,
      }))
    )

    return NextResponse.json({ quiz_id: quiz.id })
  } catch (err) {
    console.error('Error saving quiz to library:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

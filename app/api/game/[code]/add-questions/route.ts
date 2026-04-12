import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ code: string }>
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { questions } = await req.json()
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions requises' }, { status: 400 })
    }

    const { data: game } = await supabase
      .from('games')
      .select('id, host_id')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })

    const serviceSupabase = createServiceClient()

    // Compter les questions existantes
    const { count } = await serviceSupabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    const startIndex = count ?? 0

    const { error } = await serviceSupabase.from('questions').insert(
      questions.map((q: { question: string; vraie_reponse: string; synonymes: string[]; explication: string }, i: number) => ({
        game_id: game.id,
        index: startIndex + i,
        question_text: q.question,
        vraie_reponse: q.vraie_reponse,
        synonymes: q.synonymes,
        explication: q.explication,
      }))
    )

    if (error) return NextResponse.json({ error: 'Erreur insertion' }, { status: 500 })

    return NextResponse.json({ ok: true, total: startIndex + questions.length })
  } catch (err) {
    console.error('Error add-questions:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

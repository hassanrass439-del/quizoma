import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: game } = await supabase
      .from('games')
      .select('id, host_id, status, config')
      .eq('code', code)
      .single()

    if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
    if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })
    if (game.status !== 'lobby') return NextResponse.json({ error: 'Partie déjà lancée' }, { status: 409 })

    // Vérifier qu'il y a au moins 2 joueurs
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if ((count ?? 0) < 2) {
      return NextResponse.json({ error: 'Il faut au moins 2 joueurs' }, { status: 400 })
    }

    // Récupérer toutes les questions
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('*')
      .eq('game_id', game.id)
      .order('index')

    const firstQuestion = allQuestions?.[0] ?? null

    // Mode annales : pré-résoudre TOUTES les questions non-résolues en parallèle
    const unsolved = (allQuestions ?? []).filter((q) => !q.vraie_reponse)
    if (unsolved.length > 0) {
      console.log('[start] Solving', unsolved.length, 'QCM questions in parallel...')
      const t0 = Date.now()
      await Promise.all(
        unsolved.map(async (q) => {
          try {
            const solved = await solveQCMQuestion(q.question_text)
            await supabase
              .from('questions')
              .update({ vraie_reponse: solved.vraie_combinaison, explication: solved.explications })
              .eq('id', q.id)
            // Mettre à jour la première question en mémoire
            if (q.id === firstQuestion?.id) {
              firstQuestion.vraie_reponse = solved.vraie_combinaison
              firstQuestion.explication = solved.explications
            }
            console.log('[start] QCM solved Q' + q.index + ':', solved.vraie_combinaison)
          } catch (err) {
            console.error('[start] QCM solve error Q' + q.index + ':', err)
          }
        })
      )
      console.log('[start] All QCM solved in', Date.now() - t0, 'ms')
    }

    // Mettre à jour le statut + stocker l'index courant dans config
    const updatedConfig = { ...(game.config as object), current_question_index: 0 }
    const { error: updateError } = await supabase
      .from('games')
      .update({ status: 'question', config: updatedConfig })
      .eq('id', game.id)

    if (updateError) {
      console.error('[start] DB update error:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour statut' }, { status: 500 })
    }

    await serverBroadcast(`game:${code}`, 'GAME_STATE_CHANGE', {
      status: 'question',
      question_index: 0,
      question_data: firstQuestion,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error starting game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

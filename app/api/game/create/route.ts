import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateQuestions } from '@/lib/ai/generateQuestions'
import { chunkText, cleanText } from '@/lib/parsers/chunkText'
import { parseQCMBlocks } from '@/lib/parsers/parseQCMBlocks'
import { generateGameCode } from '@/lib/utils/generateCode'
import { z } from 'zod'

const schema = z.object({
  mode: z.enum(['bluff', 'annales']),
  text: z.string().min(50),
  config: z.object({
    nb_questions: z.number().int().min(1).max(30),
    timer_seconds: z.number().int().min(10).max(120),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { mode, text, config } = parsed.data
    const cleanedText = cleanText(text)

    // Générer le code de partie unique
    let code = generateGameCode()
    let attempts = 0
    while (attempts < 5) {
      const { data } = await supabase.from('games').select('id').eq('code', code).single()
      if (!data) break
      code = generateGameCode()
      attempts++
    }

    // Créer la partie en base
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        host_id: user.id,
        mode,
        status: 'lobby',
        config: { nb_questions: config.nb_questions, timer_seconds: config.timer_seconds },
      })
      .select()
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Erreur création partie' }, { status: 500 })
    }

    // Ajouter l'hôte comme joueur
    await supabase.from('game_players').insert({
      game_id: game.id,
      user_id: user.id,
    })

    // Fast-Start : générer les premières questions immédiatement
    console.log('[create] SERVICE_ROLE_KEY set?', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    const serviceSupabase = createServiceClient()

    if (mode === 'bluff') {
      const chunks = chunkText(cleanedText, { size: 500, overlap: 50 })
      const allQuestions: Array<{ question: string; vraie_reponse: string; synonymes: string[]; explication: string }> = []

      for (const chunk of chunks) {
        if (allQuestions.length >= config.nb_questions) break
        try {
          const remaining = config.nb_questions - allQuestions.length
          const result = await generateQuestions(chunk, remaining)
          allQuestions.push(...result.questions_generees)
        } catch (err) {
          console.error('[create] chunk generation error:', err)
        }
      }

      const finalQuestions = allQuestions.slice(0, config.nb_questions)
      console.log('[create] inserting', finalQuestions.length, '/', config.nb_questions, 'questions for game', game.id)

      const { data: insertedQ, error: qInsertErr } = await serviceSupabase.from('questions').insert(
        finalQuestions.map((q, i) => ({
          game_id: game.id,
          index: i,
          question_text: q.question,
          vraie_reponse: q.vraie_reponse,
          synonymes: q.synonymes,
          explication: q.explication,
        }))
      ).select()
      console.log('[create] questions insert error:', qInsertErr)
      console.log('[create] questions inserted count:', insertedQ?.length ?? 0)
    } else {
      // Mode Annales : découper en blocs QCM individuels
      const blocks = parseQCMBlocks(cleanedText)
      console.log('[create] QCM blocks found:', blocks.length)

      // Si aucun bloc détecté, traiter tout le texte comme une seule question
      const questionsToInsert = blocks.length > 0 ? blocks : [cleanedText]
      const finalBlocks = questionsToInsert.slice(0, config.nb_questions)

      const { error: qInsertErr } = await serviceSupabase.from('questions').insert(
        finalBlocks.map((block, i) => ({
          game_id: game.id,
          index: i,
          question_text: block,
          vraie_reponse: '', // Sera résolu par l'IA au moment de la question
          synonymes: [],
          explication: '',
        }))
      )
      if (qInsertErr) console.error('[create] questions insert error:', qInsertErr)

      // Mettre à jour nb_questions avec le nombre réel de blocs insérés
      if (finalBlocks.length !== config.nb_questions) {
        await serviceSupabase
          .from('games')
          .update({ config: { nb_questions: finalBlocks.length, timer_seconds: config.timer_seconds } })
          .eq('id', game.id)
      }
      console.log('[create] inserted', finalBlocks.length, 'QCM questions (unsolved)')
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('Error creating game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

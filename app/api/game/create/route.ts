import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateQuestions } from '@/lib/ai/generateQuestions'
import { chunkText, cleanText } from '@/lib/parsers/chunkText'
import { parseQCMBlocks } from '@/lib/parsers/parseQCMBlocks'
import { generateGameCode } from '@/lib/utils/generateCode'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  mode: z.enum(['bluff', 'annales']),
  text: z.string().min(10),
  fullText: z.string().optional(),
  chapters: z.array(z.object({
    title: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional(),
  config: z.object({
    nb_questions: z.number().int().min(1).max(30),
    timer_seconds: z.number().int().min(10).max(120),
  }),
})

function textFingerprint(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

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
      console.error('[create] validation error:', JSON.stringify(parsed.error.flatten()))
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { mode, text, fullText, chapters: inputChapters, config } = parsed.data
    const cleanedText = cleanText(text)
    const fingerprint = textFingerprint(cleanedText)

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
        config: {
          nb_questions: config.nb_questions,
          timer_seconds: config.timer_seconds,
          text_fingerprint: fingerprint,
          source_text: fullText || text,
          ...(inputChapters && inputChapters.length > 0 ? { chapters: inputChapters } : {}),
        },
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

    const serviceSupabase = createServiceClient()

    // ── Cache : chercher un game existant avec la même empreinte et le même mode ──
    const { data: cachedGame } = await serviceSupabase
      .from('games')
      .select('id')
      .eq('mode', mode)
      .filter('config->>text_fingerprint', 'eq', fingerprint)
      .neq('id', game.id)
      .limit(1)
      .maybeSingle()

    let cacheHit = false
    if (cachedGame) {
      const { data: cachedQuestions } = await serviceSupabase
        .from('questions')
        .select('question_text, vraie_reponse, synonymes, explication')
        .eq('game_id', cachedGame.id)
        .order('index')

      if (cachedQuestions && cachedQuestions.length > 0) {
        const questionsToUse = cachedQuestions.slice(0, config.nb_questions)
        const { error: qInsertErr } = await serviceSupabase.from('questions').insert(
          questionsToUse.map((q, i) => ({
            game_id: game.id,
            index: i,
            question_text: q.question_text,
            vraie_reponse: q.vraie_reponse,
            synonymes: q.synonymes,
            explication: q.explication,
          }))
        )
        if (!qInsertErr) {
          cacheHit = true
          console.log('[create] CACHE HIT — copied', questionsToUse.length, 'questions from game', cachedGame.id)

          // Ajuster nb_questions si nécessaire
          if (questionsToUse.length !== config.nb_questions) {
            await serviceSupabase
              .from('games')
              .update({ config: { ...game.config as object, nb_questions: questionsToUse.length } })
              .eq('id', game.id)
          }
        }
      }
    }

    // ── Cache miss : générer les questions ──
    if (!cacheHit) {
      console.log('[create] CACHE MISS — generating questions with AI')

      if (mode === 'bluff') {
        const chunks = chunkText(cleanedText, { size: 500, overlap: 50 })
        const allQuestions: Array<{ question: string; vraie_reponse: string; synonymes: string[]; explication: string }> = []
        const existingTexts = new Set<string>()

        // Plusieurs passes sur les chunks jusqu'à avoir assez de questions
        let pass = 0
        const maxPasses = 3
        while (allQuestions.length < config.nb_questions && pass < maxPasses) {
          for (const chunk of chunks) {
            if (allQuestions.length >= config.nb_questions) break
            try {
              const remaining = config.nb_questions - allQuestions.length
              const result = await generateQuestions(chunk, remaining)
              // Dédupliquer les questions entre passes
              for (const q of result.questions_generees) {
                if (!existingTexts.has(q.vraie_reponse.toLowerCase())) {
                  existingTexts.add(q.vraie_reponse.toLowerCase())
                  allQuestions.push(q)
                }
              }
            } catch (err) {
              console.error('[create] chunk generation error:', err)
            }
          }
          pass++
          if (allQuestions.length < config.nb_questions) {
            console.log(`[create] pass ${pass}: ${allQuestions.length}/${config.nb_questions} questions, retrying...`)
          }
        }

        const finalQuestions = allQuestions.slice(0, config.nb_questions)
        console.log('[create] inserting', finalQuestions.length, '/', config.nb_questions, 'questions')

        const { error: qInsertErr } = await serviceSupabase.from('questions').insert(
          finalQuestions.map((q, i) => ({
            game_id: game.id,
            index: i,
            question_text: q.question,
            vraie_reponse: q.vraie_reponse,
            synonymes: q.synonymes,
            explication: q.explication,
          }))
        )
        if (qInsertErr) console.error('[create] questions insert error:', qInsertErr)
      } else {
        // Mode Annales : découper en blocs QCM individuels
        const blocks = parseQCMBlocks(cleanedText)
        console.log('[create] QCM blocks found:', blocks.length)

        const questionsToInsert = blocks.length > 0 ? blocks : [cleanedText]
        const finalBlocks = questionsToInsert.slice(0, config.nb_questions)

        const { error: qInsertErr } = await serviceSupabase.from('questions').insert(
          finalBlocks.map((block, i) => ({
            game_id: game.id,
            index: i,
            question_text: block,
            vraie_reponse: '',
            synonymes: [],
            explication: '',
          }))
        )
        if (qInsertErr) console.error('[create] questions insert error:', qInsertErr)

        if (finalBlocks.length !== config.nb_questions) {
          await serviceSupabase
            .from('games')
            .update({ config: { ...game.config as object, nb_questions: finalBlocks.length } })
            .eq('id', game.id)
        }
        console.log('[create] inserted', finalBlocks.length, 'QCM questions (unsolved)')
      }
    }

    return NextResponse.json({ code })
  } catch (err) {
    console.error('Error creating game:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

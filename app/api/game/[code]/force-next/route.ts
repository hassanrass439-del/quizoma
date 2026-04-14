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

      // Insérer un bluff par défaut pour les joueurs qui n'ont pas répondu
      const { data: allPlayers } = await serviceSupabase
        .from('game_players')
        .select('user_id')
        .eq('game_id', game.id)

      const { data: existingBluffs } = await serviceSupabase
        .from('player_bluffs')
        .select('player_id')
        .eq('question_id', currentQuestion.id)

      const submittedIds = new Set((existingBluffs ?? []).map((b: { player_id: string }) => b.player_id))
      const missingPlayers = (allPlayers ?? []).filter((p: { user_id: string }) => !submittedIds.has(p.user_id))

      // Générer des bluffs automatiques pour les absents
      const autoBluffs = [
        'Je ne sais pas', 'Aucune idée', 'Réponse au hasard',
        'Peut-être ceci', 'Bonne question', 'Difficile à dire', 'Pas sûr du tout',
      ]
      for (let i = 0; i < missingPlayers.length; i++) {
        await serviceSupabase.from('player_bluffs').upsert(
          {
            question_id: currentQuestion.id,
            player_id: missingPlayers[i].user_id,
            bluff_text: autoBluffs[i % autoBluffs.length],
          },
          { onConflict: 'question_id,player_id' }
        )
      }

      // Récupérer TOUS les bluffs (soumis + auto)
      const { data: bluffs } = await serviceSupabase
        .from('player_bluffs')
        .select('id, bluff_text, player_id')
        .eq('question_id', currentQuestion.id)

      // Dédupliquer par texte, garder tous les player_ids
      const correctText = currentQuestion.vraie_reponse.trim().toLowerCase()
      const grouped = new Map<string, { id: string; text: string; player_ids: string[] }>()

      for (const b of (bluffs ?? []) as Array<{ id: string; bluff_text: string; player_id: string }>) {
        const key = b.bluff_text.trim().toLowerCase()
        if (key === correctText) continue
        const existing = grouped.get(key)
        if (existing) {
          existing.player_ids.push(b.player_id)
        } else {
          grouped.set(key, { id: b.id, text: b.bluff_text, player_ids: [b.player_id] })
        }
      }

      const allAnswers: Array<{ id: string; text: string; player_id: string | null; player_ids: string[] }> = [
        { id: 'correct', text: currentQuestion.vraie_reponse, player_id: null, player_ids: [] },
        ...[...grouped.values()].map((g) => ({
          id: g.id,
          text: g.text,
          player_id: g.player_ids.length === 1 ? g.player_ids[0] : null,
          player_ids: g.player_ids.length === 1 ? g.player_ids : [],
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bluffs } = await serviceSupabase
        .from('player_bluffs')
        .select('id, bluff_text, player_id, profiles:player_id(pseudo, avatar_id)')
        .eq('question_id', currentQuestion.id) as { data: Array<{ id: string; bluff_text: string; player_id: string; profiles: { pseudo: string; avatar_id: string } | null }> | null }

      const { data: votes } = await serviceSupabase
        .from('votes')
        .select('voter_id, voted_for_bluff_id, is_correct, profiles:voter_id(pseudo, avatar_id)')
        .eq('question_id', currentQuestion.id) as { data: Array<{ voter_id: string; voted_for_bluff_id: string | null; is_correct: boolean; profiles: { pseudo: string; avatar_id: string } | null }> | null }

      // Calculer les scores
      const scores: Record<string, number> = {}
      for (const vote of votes ?? []) {
        // +2 pts pour la bonne réponse
        if (vote.is_correct) {
          scores[vote.voter_id] = (scores[vote.voter_id] ?? 0) + 2
        }
      }
      // Grouper les bluffs par texte pour identifier les bluffs partagés
      const bluffsByText = new Map<string, Array<{ id: string; player_id: string }>>()
      for (const bluff of bluffs ?? []) {
        const key = bluff.bluff_text.trim().toLowerCase()
        if (!bluffsByText.has(key)) bluffsByText.set(key, [])
        bluffsByText.get(key)!.push({ id: bluff.id, player_id: bluff.player_id })
      }

      for (const bluff of bluffs ?? []) {
        const votesForBluff = (votes ?? []).filter((v) => v.voted_for_bluff_id === bluff.id)
        if (votesForBluff.length > 0) {
          // Donner les points à TOUS les auteurs du même texte
          const key = bluff.bluff_text.trim().toLowerCase()
          const allAuthors = bluffsByText.get(key) ?? [{ id: bluff.id, player_id: bluff.player_id }]
          for (const author of allAuthors) {
            scores[author.player_id] = (scores[author.player_id] ?? 0) + votesForBluff.length
          }
        }
      }

      // Mettre à jour les scores des joueurs
      for (const [userId, delta] of Object.entries(scores)) {
        await serviceSupabase.rpc('increment_player_score', {
          p_game_id: game.id,
          p_user_id: userId,
          p_points: delta,
        })
      }

      const bluffResults = (bluffs ?? []).map((b) => {
        const bluffVoters = (votes ?? [])
          .filter((v) => v.voted_for_bluff_id === b.id)
          .map((v) => ({ pseudo: v.profiles?.pseudo ?? '?' }))
        return {
          id: b.id,
          text: b.bluff_text,
          author: { pseudo: b.profiles?.pseudo ?? '?' },
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

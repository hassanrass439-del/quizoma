'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useGameSync } from '@/hooks/useGameSync'
import { useAntiCheat } from '@/hooks/useAntiCheat'
import { TimerCircle } from '@/components/game/TimerCircle'
import { QuestionCard } from '@/components/game/QuestionCard'
import { BluffInput } from '@/components/game/BluffInput'
import { VoteScreen } from '@/components/game/VoteScreen'
import { RevealScreen } from '@/components/game/RevealScreen'
import { ScoreBoard } from '@/components/game/ScoreBoard'
import type { Profile } from '@/types/game.types'

interface Props {
  code: string
  gameId: string
  mode: 'bluff' | 'annales'
  hostId: string
  currentUserId: string
  currentProfile: Profile
  initialPlayers: Array<{ user_id: string; score: number; profiles: unknown }>
  totalQuestions: number
  timerSeconds: number
  initialStatus: string
  initialQuestionIndex: number
  initialQuestionData: unknown
}

export function PlayClient({
  code,
  mode,
  hostId,
  currentUserId,
  initialPlayers,
  totalQuestions,
  timerSeconds,
  initialStatus,
  initialQuestionIndex,
  initialQuestionData,
}: Props) {
  const router = useRouter()
  const gameState = useGameSync(code, {
    status: initialStatus as import('@/types/game.types').GameStatus,
    questionIndex: initialQuestionIndex,
    questionData: initialQuestionData as import('@/hooks/useGameSync').GameSyncState['questionData'],
  })

  const [bluffValue, setBluffValue] = useState('')
  const [isSubmittingBluff, setIsSubmittingBluff] = useState(false)
  const [hasSubmittedBluff, setHasSubmittedBluff] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [votedCount, setVotedCount] = useState(0)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  const isHost = currentUserId === hostId
  const totalPlayers = initialPlayers.length
  const currentIndex = gameState.questionIndex

  const antiCheatData = gameState.questionData
    ? {
        vraie_reponse: gameState.questionData.vraie_reponse,
        synonymes: gameState.questionData.synonymes,
      }
    : null

  const { isBlocked, checkInput, reset } = useAntiCheat(antiCheatData, mode === 'bluff' ? 1 : 2)

  // Reset per-question state when question index changes (covers non-host players receiving broadcast)
  const prevIndexRef = useRef(currentIndex)
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex
      setHasSubmittedBluff(false)
      setHasVoted(false)
      setVotedCount(0)
      setBluffValue('')
      reset()
    }
  })

  async function submitBluff() {
    if (!bluffValue.trim() || isBlocked) return
    setIsSubmittingBluff(true)
    try {
      const res = await fetch(`/api/game/${code}/submit-bluff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bluff: bluffValue.trim() }),
      })
      if (!res.ok) throw new Error()
      setHasSubmittedBluff(true)
      setBluffValue('')
      reset()
    } catch {
      toast.error('Erreur lors de l\'envoi du bluff')
    } finally {
      setIsSubmittingBluff(false)
    }
  }

  async function submitVote(answerId: string) {
    try {
      const res = await fetch(`/api/game/${code}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_id: answerId }),
      })
      if (!res.ok) throw new Error()
      setHasVoted(true)
      setVotedCount((v) => v + 1)
    } catch {
      toast.error('Erreur lors du vote')
    }
  }

  async function stopGame() {
    setIsStopping(true)
    try {
      const res = await fetch(`/api/game/${code}/stop`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setShowStopConfirm(false)
    } catch {
      toast.error('Erreur lors de l\'arrêt')
    } finally {
      setIsStopping(false)
    }
  }

  async function nextQuestion() {
    try {
      const res = await fetch(`/api/game/${code}/next`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setHasSubmittedBluff(false)
      setHasVoted(false)
      setVotedCount(0)
    } catch {
      toast.error('Erreur')
    }
  }

  useEffect(() => {
    if (gameState.status === 'finished') {
      router.push(`/results/${code}`)
    }
  }, [gameState.status, code, router])

  return (
    <div className="flex flex-col min-h-dvh bg-surface-1">
      {/* Bannière de reconnexion */}
      {gameState.connectionStatus === 'disconnected' && (
        <div className="fixed top-0 w-full bg-warning text-black text-center py-2 text-sm z-50 font-semibold">
          Reconnexion en cours…
        </div>
      )}

      {/* Barre hôte */}
      {isHost && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-game-border bg-surface-2">
          <span className="text-xs text-muted-game font-semibold uppercase tracking-wider">Hôte</span>
          <button
            onClick={() => setShowStopConfirm(true)}
            className="text-xs text-danger font-semibold flex items-center gap-1 hover:text-danger/80 transition-colors"
          >
            ■ Arrêter la partie
          </button>
        </div>
      )}

      {/* Modale confirmation stop */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-2 border border-game-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center space-y-2">
              <p className="text-3xl">⚠️</p>
              <h3 className="text-text font-black text-lg">Arrêter la partie ?</h3>
              <p className="text-muted-game text-sm">Le classement actuel sera utilisé comme résultat final.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-game-border text-muted-game font-semibold hover:text-text transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={stopGame}
                disabled={isStopping}
                className="flex-1 py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger/80 transition-colors disabled:opacity-50"
              >
                {isStopping ? 'Arrêt…' : 'Arrêter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-4 py-5 space-y-4">
        {/* Question en attente de données */}
        {gameState.status === 'question' && !gameState.questionData && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 pt-20 text-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text font-bold">Chargement de la question…</p>
          </div>
        )}

        {/* Question phase */}
        {gameState.status === 'question' && gameState.questionData && (
          <>
            <div className="flex items-center justify-between">
              <TimerCircle
                durationSeconds={timerSeconds}
                onExpire={() => !hasSubmittedBluff && submitBluff()}
              />
              <div className="text-right">
                <p className="text-muted-game text-xs uppercase tracking-wider">Mode</p>
                <p className="text-text font-bold capitalize">{mode}</p>
              </div>
            </div>

            <QuestionCard
              questionText={gameState.questionData.question_text}
              questionIndex={currentIndex}
              totalQuestions={totalQuestions}
            />

            {hasSubmittedBluff ? (
              <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-4 text-center">
                <p className="text-success font-bold">✓ Bluff envoyé !</p>
                <p className="text-muted-game text-sm mt-1">En attente des autres joueurs…</p>
              </div>
            ) : (
              <BluffInput
                value={bluffValue}
                onChange={(v) => { setBluffValue(v); checkInput(v) }}
                onSubmit={submitBluff}
                isBlocked={isBlocked}
                isSubmitting={isSubmittingBluff}
                mode={mode === 'bluff' ? 1 : 2}
              />
            )}
          </>
        )}

        {/* Vote phase */}
        {gameState.status === 'voting' && gameState.votePayload && (
          <VoteScreen
            payload={gameState.votePayload}
            totalPlayers={totalPlayers}
            votedCount={votedCount}
            onVote={submitVote}
            hasVoted={hasVoted}
            currentUserId={currentUserId}
          />
        )}

        {/* Reveal phase */}
        {gameState.status === 'reveal' && gameState.revealPayload && (
          <RevealScreen
            payload={gameState.revealPayload}
            isHost={isHost}
            onNext={nextQuestion}
            questionIndex={currentIndex}
            totalQuestions={totalQuestions}
          />
        )}

        {/* Lobby (en attente de lancement) */}
        {gameState.status === 'lobby' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 pt-12">
            <div className="text-4xl animate-bounce">🎮</div>
            <p className="text-text font-bold text-xl">Partie en cours de démarrage…</p>
            <p className="text-muted-game text-sm">L&apos;hôte va lancer la partie</p>
          </div>
        )}
      </div>
    </div>
  )
}

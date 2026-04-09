'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useGameSync, type GameSyncState } from '@/hooks/useGameSync'
import { createClient } from '@/lib/supabase/client'
import { isCorrectAnswer } from '@/lib/ai/antiCheat'
import { QuestionCard } from '@/components/game/QuestionCard'
import { BluffInput } from '@/components/game/BluffInput'
import { VoteScreen } from '@/components/game/VoteScreen'
import { RevealScreen } from '@/components/game/RevealScreen'
import { avatarUrl, getAvatar } from '@/lib/avatars'
import Image from 'next/image'
import { SkipForward } from 'lucide-react'
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
  gameId,
  mode,
  hostId,
  currentUserId,
  currentProfile,
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
  const [isForcing, setIsForcing] = useState(false)
  const [playerScores, setPlayerScores] = useState<Record<string, number>>(
    Object.fromEntries(initialPlayers.map((p) => [p.user_id, p.score]))
  )

  const isHost = currentUserId === hostId
  const totalPlayers = initialPlayers.length
  const currentIndex = gameState.questionIndex
  const myScore = playerScores[currentUserId] ?? 0

  // Rejoin: si le joueur revient et qu'il manque des données (broadcast manqué)
  const [rejoinData, setRejoinData] = useState<{
    questionData?: GameSyncState['questionData']
    votePayload?: GameSyncState['votePayload']
    revealPayload?: GameSyncState['revealPayload']
  }>({})
  const [rejoinDone, setRejoinDone] = useState(false)

  useEffect(() => {
    if (rejoinDone) return
    const needsRejoin =
      (gameState.status === 'question' && !gameState.questionData) ||
      (gameState.status === 'voting' && !gameState.votePayload) ||
      (gameState.status === 'reveal' && !gameState.revealPayload)
    if (!needsRejoin) return

    setRejoinDone(true)
    fetch(`/api/game/${code}/rejoin`)
      .then((res) => res.json())
      .then((data) => {
        setRejoinData({
          questionData: data.questionData ?? undefined,
          votePayload: data.votePayload ?? undefined,
          revealPayload: data.revealPayload ?? undefined,
        })
        if (data.hasSubmittedBluff) setHasSubmittedBluff(true)
        if (data.hasVoted) setHasVoted(true)
      })
      .catch(() => {})
  }, [gameState.status, gameState.questionData, gameState.votePayload, gameState.revealPayload, rejoinDone, code])

  // Reset rejoin quand la question change
  useEffect(() => {
    setRejoinDone(false)
    setRejoinData({})
  }, [currentIndex])

  const effectiveQuestionData = gameState.questionData ?? rejoinData.questionData ?? null
  const effectiveVotePayload = gameState.votePayload ?? rejoinData.votePayload ?? null
  const effectiveRevealPayload = gameState.revealPayload ?? rejoinData.revealPayload ?? null

  const antiCheatData = effectiveQuestionData
    ? { vraie_reponse: effectiveQuestionData.vraie_reponse, synonymes: effectiveQuestionData.synonymes }
    : null

  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const rev = effectiveRevealPayload
    if (rev?.scores) {
      setPlayerScores((prev) => {
        const updated = { ...prev }
        for (const [userId, delta] of Object.entries(rev.scores)) {
          updated[userId] = (updated[userId] ?? 0) + delta
        }
        return updated
      })
    }
  }, [effectiveRevealPayload])

  const prevIndexRef = useRef(currentIndex)
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      prevIndexRef.current = currentIndex
      setHasSubmittedBluff(false)
      setHasVoted(false)
      setVotedCount(0)
      setBluffValue('')
      setIsBlocked(false)
    }
  })

  async function submitBluff() {
    const trimmed = bluffValue.trim()
    if (!trimmed) return

    // Anti-triche : vérifier seulement au moment du submit
    if (antiCheatData && isCorrectAnswer(trimmed, mode === 'bluff' ? 1 : 2, antiCheatData)) {
      setIsBlocked(true)
      return
    }

    setIsBlocked(false)
    setIsSubmittingBluff(true)
    try {
      const res = await fetch(`/api/game/${code}/submit-bluff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bluff: trimmed }),
      })
      if (!res.ok) throw new Error()
      setHasSubmittedBluff(true)
      setBluffValue('')
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

  async function forceNext() {
    setIsForcing(true)
    try {
      const res = await fetch(`/api/game/${code}/force-next`, { method: 'POST' })
      if (!res.ok) throw new Error()
    } catch {
      toast.error('Erreur')
    } finally {
      setIsForcing(false)
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
    if (gameState.status === 'finished') router.push(`/results/${code}`)
  }, [gameState.status, code, router])

  return (
    <div className="flex flex-col min-h-dvh bg-[#12121f]">
      {/* Reconnection banner */}
      {gameState.connectionStatus === 'disconnected' && (
        <div className="fixed top-0 left-0 right-0 bg-warning text-black text-center py-2 text-sm z-50 font-semibold">
          Reconnexion en cours…
        </div>
      )}

      {/* Stop confirm modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface-2 border border-[#484456] rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center space-y-2">
              <p className="text-3xl">⚠️</p>
              <h3 className="text-text font-black text-lg font-headline">Arrêter la partie ?</h3>
              <p className="text-text-muted text-sm">Le classement actuel sera utilisé comme résultat final.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowStopConfirm(false)} className="flex-1 py-3 rounded-xl border border-[#484456] text-text-muted font-semibold hover:text-text transition-colors">
                Annuler
              </button>
              <button onClick={stopGame} disabled={isStopping} className="flex-1 py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger/80 transition-colors disabled:opacity-50">
                {isStopping ? 'Arrêt…' : 'Arrêter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/60 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4">
        <div className="flex flex-col">
          <span className="text-text-muted text-[10px] font-bold tracking-widest">
            Q {currentIndex + 1}/{totalQuestions}
          </span>
          {isHost && (
            <button onClick={() => setShowStopConfirm(true)} className="text-[10px] text-danger font-semibold hover:text-danger/80 transition-colors">
              ■ Arrêter
            </button>
          )}
        </div>

        {/* My score */}
        <div className="flex items-center gap-2 bg-[#6c3ff5]/20 px-3 py-1.5 rounded-xl">
          <span className="text-primary-tint font-black font-headline tracking-tight text-sm">{myScore}</span>
          <div className="w-6 h-6 rounded-full bg-[#6c3ff5] flex items-center justify-center overflow-hidden">
            <Image
              src={avatarUrl(getAvatar(currentProfile?.avatar_id).seed, getAvatar(currentProfile?.avatar_id).bg, 24)}
              alt="moi"
              width={24}
              height={24}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 pt-4 pb-32 max-w-md mx-auto w-full flex flex-col items-center">

        {/* Loading — rejoin en cours ou données manquantes */}
        {((gameState.status === 'question' && !effectiveQuestionData) ||
          (gameState.status === 'voting' && !effectiveVotePayload) ||
          (gameState.status === 'reveal' && !effectiveRevealPayload)) && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 pt-20 text-center">
            <div className="w-10 h-10 border-2 border-[#6c3ff5] border-t-transparent rounded-full animate-spin" />
            <p className="text-text font-bold font-headline">Reconnexion en cours…</p>
          </div>
        )}

        {/* Question phase */}
        {gameState.status === 'question' && effectiveQuestionData && (
          <>
            {/* Question card with left glow border */}
            <div className="w-full bg-surface-2 p-6 rounded-xl border-l-4 border-[#6c3ff5] shadow-[-4px_0_12px_-2px_rgba(108,63,245,0.4)] relative mb-8">
              <span className="text-[#6c3ff5] font-black text-[11px] tracking-widest mb-3 block font-headline">
                {mode === 'bluff' ? 'COMPLÈTE LA PHRASE' : 'QCM'}
              </span>
              <QuestionCard
                questionText={effectiveQuestionData.question_text}
                questionIndex={currentIndex}
                totalQuestions={totalQuestions}
                mode={mode === 'bluff' ? 1 : 2}
              />
            </div>

            {/* Bluff input / submitted */}
            {hasSubmittedBluff ? (
              <div className="w-full bg-[#45dfa4]/10 border border-[#45dfa4]/30 rounded-xl px-4 py-4 text-center">
                <p className="text-[#45dfa4] font-bold font-headline">✓ Bluff envoyé !</p>
                <p className="text-text-muted text-sm mt-1">En attente des autres joueurs…</p>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-text font-bold text-lg font-headline">Ta réponse 🎭</h2>
                  <p className="text-text-muted text-sm">Invente une mauvaise réponse pour piéger les autres</p>
                </div>
                <BluffInput
                  value={bluffValue}
                  onChange={(v) => { setBluffValue(v); setIsBlocked(false) }}
                  onSubmit={submitBluff}
                  isBlocked={false}
                  isSubmitting={isSubmittingBluff}
                  mode={mode === 'bluff' ? 1 : 2}
                />
                {isBlocked && (
                  <div className="p-4 bg-[#b83900]/10 rounded-xl flex gap-3 items-start border border-[#b83900]/20">
                    <span className="text-[#ffb59d] text-lg">⚠️</span>
                    <div>
                      <p className="text-[13px] text-[#ffb59d] font-bold">C&apos;est la bonne réponse !</p>
                      <p className="text-[12px] text-[#ffb59d]/80 mt-0.5">Trouve un vrai bluff pour piéger les autres joueurs.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Vote phase */}
        {gameState.status === 'voting' && effectiveVotePayload && (
          <VoteScreen
            payload={effectiveVotePayload}
            questionText={effectiveQuestionData?.question_text}
            onVote={submitVote}
            hasVoted={hasVoted}
            currentUserId={currentUserId}
            isHost={isHost}
            onForceNext={forceNext}
            isForcing={isForcing}
          />
        )}

        {/* Reveal phase */}
        {gameState.status === 'reveal' && effectiveRevealPayload && (
          <RevealScreen
            payload={effectiveRevealPayload}
            isHost={isHost}
            onNext={nextQuestion}
            questionIndex={currentIndex}
            totalQuestions={totalQuestions}
            currentUserId={currentUserId}
            playerScores={playerScores}
            players={initialPlayers.map((p) => {
              const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Profile | null
              return { user_id: p.user_id, pseudo: profile?.pseudo ?? '?', avatar_id: profile?.avatar_id ?? '' }
            })}
          />
        )}

        {/* Waiting for host */}
        {gameState.status === 'lobby' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 pt-12">
            <div className="text-4xl animate-bounce">🎮</div>
            <p className="text-text font-bold text-xl font-headline">Partie en cours de démarrage…</p>
            <p className="text-text-muted text-sm">L&apos;hôte va lancer la partie</p>
          </div>
        )}
      </div>

      {/* Bottom bar — avatars + forcer */}
      {(gameState.status === 'question' || gameState.status === 'voting') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d1a]/80 backdrop-blur-md border-t border-[#484456]/30 px-4 py-3">
          <div className="max-w-md mx-auto space-y-3">
            {/* Avatars */}
            <div className="flex justify-center gap-4">
              {initialPlayers.map((p) => {
                const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Profile | null
                if (!profile) return null
                const av = getAvatar(profile.avatar_id)
                const isMe = p.user_id === currentUserId
                const isDone = gameState.status === 'question'
                  ? (isMe ? hasSubmittedBluff : gameState.submittedPlayers.includes(p.user_id))
                  : (isMe ? hasVoted : false)
                return (
                  <div key={p.user_id} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                      isDone ? 'border-[#45dfa4] opacity-100' : 'border-[#484456] opacity-40'
                    }`}>
                      <Image
                        src={avatarUrl(av.seed, av.bg, 40)}
                        alt={profile.pseudo}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <span className={`text-[10px] font-bold truncate max-w-[56px] text-center transition-all duration-300 ${
                      isDone ? 'text-[#45dfa4]' : 'text-text-muted/50'
                    }`}>
                      {isMe ? 'Toi' : profile.pseudo}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bouton forcer — hôte uniquement, après avoir soumis/voté */}
            {isHost && ((gameState.status === 'question' && hasSubmittedBluff) || (gameState.status === 'voting' && hasVoted)) && (
              <button
                onClick={forceNext}
                disabled={isForcing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-warning/30 bg-warning/10 text-warning font-semibold text-sm hover:bg-warning/20 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                <SkipForward size={16} />
                {isForcing ? 'Passage en cours…' : (
                  gameState.status === 'question' ? 'Forcer le passage au vote' : 'Forcer le passage au résultat'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Atmospheric glows */}
      <div className="fixed top-1/4 -right-20 w-64 h-64 bg-[#6c3ff5]/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-1/4 -left-20 w-64 h-64 bg-[#b83900]/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
    </div>
  )
}

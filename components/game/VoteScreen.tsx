'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StartVotePayload } from '@/types/game.types'

interface Props {
  payload: StartVotePayload
  questionText?: string
  onVote: (answerId: string) => void
  hasVoted: boolean
  currentUserId: string
  isHost?: boolean
  onForceNext?: () => void
  isForcing?: boolean
}

export function VoteScreen({ payload, questionText, onVote, hasVoted, currentUserId, isHost, onForceNext, isForcing }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const answers = payload.answers.filter((a) => a.player_id !== currentUserId)

  function handleVote(answerId: string) {
    if (hasVoted) return
    setSelected(answerId)
    onVote(answerId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-text">Qui a raison ?</h2>
        <p className="text-muted-game text-sm mt-1">Trouve la vraie réponse !</p>
      </div>

      {questionText && (
        <div className="bg-surface-2 border border-game-border rounded-xl px-4 py-3">
          <p className="text-text text-sm font-medium leading-relaxed">{questionText}</p>
        </div>
      )}

      {/* Boutons de réponse */}
      <div className="flex flex-col gap-3">
        {answers.map((answer) => (
          <Button
            key={answer.id}
            onClick={() => handleVote(answer.id)}
            disabled={hasVoted}
            className={`w-full min-h-[60px] rounded-button font-semibold text-left justify-start px-5 transition-all ${
              selected === answer.id
                ? 'bg-primary border-2 border-primary-light text-white'
                : 'bg-surface-2 border border-game-border text-text hover:bg-surface-3 hover:border-primary/50'
            }`}
          >
            {answer.text}
          </Button>
        ))}
      </div>

      {hasVoted && (
        <div className="flex items-center justify-center gap-2 py-3">
          <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-game text-sm">En attente des autres joueurs…</p>
        </div>
      )}
    </div>
  )
}

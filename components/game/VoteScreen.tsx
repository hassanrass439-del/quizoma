'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { StartVotePayload } from '@/types/game.types'

interface Props {
  payload: StartVotePayload
  totalPlayers: number
  votedCount: number
  onVote: (answerId: string) => void
  hasVoted: boolean
  currentUserId: string
}

export function VoteScreen({ payload, totalPlayers, votedCount, onVote, hasVoted, currentUserId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  // Mélange des réponses (fait côté serveur normalement, mais on s'assure côté client aussi)
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

      {/* Progression des votes */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-game">
          <span>{votedCount}/{totalPlayers} joueurs ont voté</span>
          {votedCount === totalPlayers && <span className="text-success">Tous ont voté !</span>}
        </div>
        <Progress
          value={(votedCount / totalPlayers) * 100}
          className="h-2 bg-surface-3"
        />
      </div>

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
        <p className="text-center text-muted-game text-sm animate-pulse">
          En attente des autres joueurs…
        </p>
      )}
    </div>
  )
}

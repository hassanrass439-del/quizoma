'use client'

import { useState } from 'react'
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

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export function VoteScreen({ payload, questionText, onVote, hasVoted, currentUserId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const answers = payload.answers.filter((a) => {
    // Filtrer les réponses du joueur courant (via player_ids si disponible, sinon player_id)
    const ids: string[] = (a as { player_ids?: string[] }).player_ids ?? (a.player_id ? [a.player_id] : [])
    return !ids.includes(currentUserId)
  })

  function handleVote(answerId: string) {
    if (hasVoted) return
    setSelected(answerId)
    onVote(answerId)
  }

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Header */}
      <div className="text-center">
        <span className="text-[#6c3ff5] font-black text-[11px] tracking-widest font-headline">QUI A RAISON ?</span>
        <h2 className="text-xl font-black text-[#e3e0f4] font-headline mt-1">Trouve la vraie réponse</h2>
      </div>

      {/* Question rappel */}
      {questionText && (
        <div className="bg-[#1e1e2c] border-l-4 border-[#6c3ff5] rounded-xl px-4 py-3 shadow-[-4px_0_12px_-2px_rgba(108,63,245,0.3)]">
          <p className="text-[#e3e0f4] text-sm font-medium leading-relaxed">{questionText}</p>
        </div>
      )}

      {/* Propositions */}
      <div className="flex flex-col gap-2.5">
        {answers.map((answer, i) => {
          const letter = LETTERS[i] ?? String(i + 1)
          const isSelected = selected === answer.id
          const isDisabled = hasVoted && !isSelected

          return (
            <button
              key={answer.id}
              onClick={() => handleVote(answer.id)}
              disabled={hasVoted}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
                isSelected
                  ? 'bg-[#6c3ff5]/20 border-2 border-[#6c3ff5] shadow-lg shadow-[#6c3ff5]/10'
                  : isDisabled
                    ? 'bg-[#1e1e2c] border border-[#484456]/20 opacity-40'
                    : 'bg-[#1e1e2c] border border-[#484456]/40 hover:border-[#6c3ff5]/50 hover:bg-[#292937]'
              }`}
            >
              {/* Lettre */}
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                isSelected
                  ? 'bg-[#6c3ff5] text-white'
                  : 'bg-[#292937] text-[#cbbeff]'
              }`}>
                {letter}
              </span>

              {/* Texte */}
              <span className={`text-sm font-semibold leading-snug ${
                isSelected ? 'text-[#cbbeff]' : 'text-[#e3e0f4]'
              }`}>
                {answer.text}
              </span>

              {/* Check si sélectionné */}
              {isSelected && (
                <span className="ml-auto flex-shrink-0 w-5 h-5 bg-[#6c3ff5] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Attente */}
      {hasVoted && (
        <div className="flex items-center justify-center gap-2 py-3 bg-[#45dfa4]/10 border border-[#45dfa4]/20 rounded-xl">
          <span className="w-4 h-4 border-2 border-[#45dfa4] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#45dfa4] text-sm font-bold">Vote enregistré — en attente des autres</p>
        </div>
      )}
    </div>
  )
}

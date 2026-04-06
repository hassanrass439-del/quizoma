'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { RevealPayload } from '@/types/game.types'

interface Props {
  payload: RevealPayload
  isHost: boolean
  onNext: () => void
  questionIndex: number
  totalQuestions: number
  currentUserId: string
  playerScores: Record<string, number>
  players: Array<{ user_id: string; pseudo: string; avatar_id: string }>
}

export function RevealScreen({ payload, isHost, onNext, questionIndex, totalQuestions, currentUserId, playerScores, players }: Props) {
  const [explanationOpen, setExplanationOpen] = useState(false)
  const isLastQuestion = questionIndex >= totalQuestions - 1
  const myGain = payload.scores?.[currentUserId] ?? 0

  return (
    <div className="flex flex-col gap-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-2"
      >
        <CheckCircle2 size={40} className="text-success" />
        <h2 className="text-2xl font-black text-text">Bonne réponse !</h2>
        <div className="bg-success/20 border border-success/40 rounded-xl px-6 py-3">
          <p className="text-success font-black text-xl text-center">
            {payload.correct_answer}
          </p>
        </div>
        {myGain > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="bg-[#45dfa4]/20 border border-[#45dfa4]/40 rounded-full px-4 py-1.5"
          >
            <span className="text-[#45dfa4] font-black text-lg">+{myGain} pts</span>
          </motion.div>
        )}
      </motion.div>

      {/* Bluffs */}
      <div className="space-y-2">
        <h3 className="text-text font-bold text-sm uppercase tracking-wider">Bluffs</h3>
        {payload.bluffs.map((bluff, i) => (
          <motion.div
            key={bluff.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-2 border border-game-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-game text-sm font-medium">{bluff.author.pseudo}</p>
                <p className="text-text font-bold">{bluff.text}</p>
              </div>
              {bluff.voters.length > 0 && (
                <div className="flex items-center gap-1 bg-accent/20 border border-accent/30 rounded-lg px-2 py-1">
                  <span className="text-accent font-bold text-sm">
                    +{bluff.voters.length}
                  </span>
                </div>
              )}
            </div>
            {bluff.voters.length > 0 && (
              <p className="text-xs text-muted-game mt-1">
                Piégé : {bluff.voters.map((v) => v.pseudo).join(', ')}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Explication IA */}
      {payload.explanation && (
        <div className="bg-surface-2 border border-game-border rounded-xl overflow-hidden">
          <button
            onClick={() => setExplanationOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 min-touch"
          >
            <span className="text-text font-semibold text-sm">Explication IA</span>
            {explanationOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <AnimatePresence>
            {explanationOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {payload.explanation.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-text-muted text-sm leading-relaxed text-left">
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Classement */}
      <div className="space-y-2">
        <h3 className="text-text font-bold text-sm uppercase tracking-wider">Classement</h3>
        {[...players]
          .sort((a, b) => (playerScores[b.user_id] ?? 0) - (playerScores[a.user_id] ?? 0))
          .map((p, i) => {
            const score = playerScores[p.user_id] ?? 0
            const gain = payload.scores?.[p.user_id] ?? 0
            const isMe = p.user_id === currentUserId
            return (
              <motion.div
                key={p.user_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                  isMe ? 'bg-[#6c3ff5]/15 border border-[#6c3ff5]/30' : 'bg-surface-2 border border-game-border'
                }`}
              >
                <span className="text-text-muted font-bold text-sm w-5">{i + 1}.</span>
                <span className="flex-1 text-text font-bold text-sm truncate">
                  {p.pseudo}{isMe ? ' (toi)' : ''}
                </span>
                {gain > 0 && (
                  <span className="text-[#45dfa4] text-xs font-bold">+{gain}</span>
                )}
                <span className="text-[#cbbeff] font-black text-sm">{score}</span>
              </motion.div>
            )
          })}
      </div>

      {isHost && (
        <Button
          onClick={onNext}
          className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
        >
          {isLastQuestion ? 'Voir le podium 🏆' : 'Question suivante →'}
        </Button>
      )}
    </div>
  )
}

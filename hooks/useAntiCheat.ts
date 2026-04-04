'use client'

import { useState, useCallback } from 'react'
import { isCorrectAnswer } from '@/lib/ai/antiCheat'
import type { AntiCheatData } from '@/types/game.types'

export function useAntiCheat(questionData: AntiCheatData | null, mode: 1 | 2) {
  const [isBlocked, setIsBlocked] = useState(false)

  const checkInput = useCallback(
    (value: string) => {
      if (!questionData) {
        setIsBlocked(false)
        return
      }
      setIsBlocked(isCorrectAnswer(value, mode, questionData))
    },
    [questionData, mode]
  )

  const reset = useCallback(() => setIsBlocked(false), [])

  return { isBlocked, checkInput, reset }
}

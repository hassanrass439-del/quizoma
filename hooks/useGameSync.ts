'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  GameStatePayload,
  StartVotePayload,
  RevealPayload,
  FinalRankingEntry,
  GameStatus,
} from '@/types/game.types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface GameSyncState {
  status: GameStatus
  questionIndex: number
  questionData: GameStatePayload['question_data'] | null
  votePayload: StartVotePayload | null
  revealPayload: RevealPayload | null
  finalRanking: FinalRankingEntry[] | null
  connectionStatus: ConnectionStatus
  submittedPlayers: string[]
}

interface InitialState {
  status: GameStatus
  questionIndex: number
  questionData: GameStatePayload['question_data'] | null
}

export function useGameSync(code: string, initial?: InitialState) {
  const [state, setState] = useState<GameSyncState>({
    status: initial?.status ?? 'lobby',
    questionIndex: initial?.questionIndex ?? 0,
    questionData: initial?.questionData ?? null,
    votePayload: null,
    revealPayload: null,
    finalRanking: null,
    connectionStatus: 'connecting',
    submittedPlayers: [],
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`game:${code}`)

    channel
      .on('broadcast', { event: 'GAME_STATE_CHANGE' }, ({ payload }) => {
        const p = payload as GameStatePayload
        setState((prev) => ({
          ...prev,
          status: p.status,
          questionIndex: p.question_index,
          questionData: p.question_data ?? null,
          votePayload: null,
          revealPayload: null,
          submittedPlayers: [],
        }))
      })
      .on('broadcast', { event: 'PLAYER_SUBMITTED' }, ({ payload }) => {
        const p = payload as { user_id: string }
        setState((prev) => ({
          ...prev,
          submittedPlayers: prev.submittedPlayers.includes(p.user_id)
            ? prev.submittedPlayers
            : [...prev.submittedPlayers, p.user_id],
        }))
      })
      .on('broadcast', { event: 'START_VOTE' }, ({ payload }) => {
        setState((prev) => ({
          ...prev,
          status: 'voting',
          votePayload: payload as StartVotePayload,
        }))
      })
      .on('broadcast', { event: 'REVEAL' }, ({ payload }) => {
        setState((prev) => ({
          ...prev,
          status: 'reveal',
          revealPayload: payload as RevealPayload,
        }))
      })
      .on('broadcast', { event: 'GAME_OVER' }, ({ payload }) => {
        const p = payload as { final_ranking: FinalRankingEntry[] }
        setState((prev) => ({
          ...prev,
          status: 'finished',
          finalRanking: p.final_ranking,
        }))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setState((prev) => ({ ...prev, connectionStatus: 'connected' }))
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }))
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code])

  return state
}

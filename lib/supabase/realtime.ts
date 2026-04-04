'use client'

import { useEffect, useRef } from 'react'
import { createClient } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  GameStatePayload,
  StartVotePayload,
  RevealPayload,
  FinalRankingEntry,
} from '@/types/game.types'

export interface GameChannelHandlers {
  onStateChange?: (payload: GameStatePayload) => void
  onStartVote?: (payload: StartVotePayload) => void
  onReveal?: (payload: RevealPayload) => void
  onGameOver?: (payload: { final_ranking: FinalRankingEntry[] }) => void
  onPlayerJoin?: (state: Record<string, unknown>) => void
  onPlayerLeave?: (state: Record<string, unknown>) => void
}

export function useGameChannel(code: string, handlers: GameChannelHandlers) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`game:${code}`)

    channel
      .on('broadcast', { event: 'GAME_STATE_CHANGE' }, ({ payload }) => {
        handlers.onStateChange?.(payload as GameStatePayload)
      })
      .on('broadcast', { event: 'START_VOTE' }, ({ payload }) => {
        handlers.onStartVote?.(payload as StartVotePayload)
      })
      .on('broadcast', { event: 'REVEAL' }, ({ payload }) => {
        handlers.onReveal?.(payload as RevealPayload)
      })
      .on('broadcast', { event: 'GAME_OVER' }, ({ payload }) => {
        handlers.onGameOver?.(payload as { final_ranking: FinalRankingEntry[] })
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        handlers.onPlayerJoin?.(newPresences as unknown as Record<string, unknown>)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        handlers.onPlayerLeave?.(leftPresences as unknown as Record<string, unknown>)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return channelRef
}

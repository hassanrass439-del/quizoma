'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { PlayerList } from '@/components/lobby/PlayerList'
import { GameCodeDisplay } from '@/components/lobby/GameCodeDisplay'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/game.types'

interface Props {
  code: string
  gameId: string
  hostId: string
  currentUserId: string
  initialPlayers: Profile[]
}

export function LobbyClient({ code, gameId, hostId, currentUserId, initialPlayers }: Props) {
  const router = useRouter()
  const [players, setPlayers] = useState<Profile[]>(initialPlayers)
  const [isStarting, setIsStarting] = useState(false)

  const isHost = currentUserId === hostId
  const gameUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/lobby/${code}`

  // Écouter les nouveaux joueurs via Realtime Presence
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`game:${code}`)

    channel
      .on('broadcast', { event: 'GAME_STATE_CHANGE' }, ({ payload }) => {
        if (payload.status !== 'lobby') {
          router.push(`/play/${code}`)
        }
      })
      .subscribe()

    // Polling pour les nouveaux joueurs (fallback simple)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('game_players')
        .select('user_id, profiles(*)')
        .eq('game_id', gameId)

      if (data) {
        const profiles = data
          .map((p) => (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles))
          .filter(Boolean) as Profile[]
        setPlayers(profiles)
      }
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [code, gameId, router])

  async function handleStart() {
    if (players.length < 2) {
      toast.error('Il faut au moins 2 joueurs pour démarrer')
      return
    }
    setIsStarting(true)
    try {
      const res = await fetch(`/api/game/${code}/start`, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      router.push(`/play/${code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader title="Salle d'attente" backHref="/dashboard" />

      <div className="flex-1 px-4 py-5 space-y-6">
        <GameCodeDisplay code={code} gameUrl={gameUrl} />

        <PlayerList
          players={players}
          hostId={hostId}
          minPlayers={2}
        />

        {isHost ? (
          <Button
            onClick={handleStart}
            disabled={isStarting || players.length < 2}
            className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
          >
            {isStarting ? 'Démarrage…' : `Lancer la partie (${players.length} joueurs)`}
          </Button>
        ) : (
          <div className="bg-surface-2 border border-game-border rounded-xl px-4 py-3 text-center">
            <p className="text-muted-game text-sm animate-pulse">
              En attente du lancement par l&apos;hôte…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

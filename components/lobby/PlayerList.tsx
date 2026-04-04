'use client'

import type { Profile } from '@/types/game.types'

const AVATAR_EMOJIS: Record<string, string> = {
  fox: '🦊', cat: '🐱', dog: '🐶', panda: '🐼',
  lion: '🦁', tiger: '🐯', bear: '🐻', rabbit: '🐰',
  wolf: '🐺', owl: '🦉', penguin: '🐧', frog: '🐸',
}

interface Props {
  players: Profile[]
  hostId: string
  minPlayers?: number
}

export function PlayerList({ players, hostId, minPlayers = 2 }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-text font-bold text-sm uppercase tracking-wider">
          Joueurs ({players.length})
        </h3>
        {players.length < minPlayers && (
          <span className="text-warning text-xs">
            Min. {minPlayers} pour démarrer
          </span>
        )}
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 bg-surface-2 border border-game-border rounded-xl px-4 py-3"
          >
            <span className="text-2xl">{AVATAR_EMOJIS[player.avatar_id] ?? '🎮'}</span>
            <span className="flex-1 text-text font-semibold">{player.pseudo}</span>
            {player.id === hostId && (
              <span className="text-xs bg-accent/20 text-accent border border-accent/30 rounded-lg px-2 py-0.5 font-semibold">
                Hôte
              </span>
            )}
          </div>
        ))}

        {/* Slots vides */}
        {Array.from({ length: Math.max(0, minPlayers - players.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 bg-surface-2 border border-dashed border-game-border rounded-xl px-4 py-3 opacity-50"
          >
            <span className="text-2xl text-muted-game">?</span>
            <span className="text-muted-game text-sm">En attente…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

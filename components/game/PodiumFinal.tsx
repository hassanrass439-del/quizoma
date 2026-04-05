'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { getAvatar, avatarUrl } from '@/lib/avatars'
import type { FinalRankingEntry } from '@/types/game.types'

interface Props {
  ranking: FinalRankingEntry[]
}

export function PodiumFinal({ ranking }: Props) {
  const top3 = ranking.slice(0, 3)
  const rest = ranking.slice(3)

  // Ordre podium : 2ème, 1er, 3ème
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumHeights = [80, 110, 60]
  const podiumColors = ['#8888AA', '#6C3FF5', '#FF6B35']
  const medals = ['🥈', '🥇', '🥉']

  return (
    <div className="space-y-6">
      {/* Podium top 3 */}
      <div className="flex items-end justify-center gap-3 pt-4">
        {podiumOrder.map((entry, i) => {
          if (!entry) return null
          const av = getAvatar(entry.player.avatar_id)
          return (
            <motion.div
              key={entry.player.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3, type: 'spring', stiffness: 120 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#484456]">
                <Image
                  src={avatarUrl(av.seed, av.bg, 56)}
                  alt={entry.player.pseudo}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <span className="text-text font-bold text-sm max-w-[80px] truncate text-center">
                {entry.player.pseudo}
              </span>
              <span className="text-primary-light font-black text-sm">{entry.score} pts</span>
              <div
                className="w-20 flex flex-col items-center justify-center rounded-t-xl font-black text-2xl"
                style={{
                  height: podiumHeights[i],
                  backgroundColor: podiumColors[i] + '33',
                  border: `2px solid ${podiumColors[i]}`,
                  color: podiumColors[i],
                }}
              >
                {medals[i]}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Reste du classement */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry, i) => {
            const av = getAvatar(entry.player.avatar_id)
            return (
              <motion.div
                key={entry.player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="flex items-center gap-3 bg-surface-2 border border-game-border rounded-xl px-4 py-3"
              >
                <span className="text-muted-game font-bold w-6 text-right text-sm">{i + 4}.</span>
                <div className="w-9 h-9 rounded-full overflow-hidden border border-[#484456] flex-shrink-0">
                  <Image
                    src={avatarUrl(av.seed, av.bg, 36)}
                    alt={entry.player.pseudo}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="flex-1 text-text font-semibold text-sm">{entry.player.pseudo}</span>
                <span className="text-primary-light font-bold">{entry.score} pts</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ScoreEntry {
  playerId: string
  pseudo: string
  avatarId: string
  score: number
}

const AVATAR_EMOJIS: Record<string, string> = {
  fox: '🦊', cat: '🐱', dog: '🐶', panda: '🐼',
  lion: '🦁', tiger: '🐯', bear: '🐻', rabbit: '🐰',
  wolf: '🐺', owl: '🦉', penguin: '🐧', frog: '🐸',
}

interface Props {
  scores: ScoreEntry[]
  currentUserId: string
}

export function ScoreBoard({ scores, currentUserId }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score)

  return (
    <div className="bg-surface-2 border border-game-border rounded-card p-4 space-y-2">
      <h3 className="text-text font-bold text-sm uppercase tracking-wider">Classement</h3>
      {sorted.map((entry, i) => (
        <div
          key={entry.playerId}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
            entry.playerId === currentUserId ? 'bg-primary/10 border border-primary/30' : ''
          }`}
        >
          <span className="text-muted-game font-bold w-5 text-right text-sm">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
          </span>
          <span className="text-lg">{AVATAR_EMOJIS[entry.avatarId] ?? '🎮'}</span>
          <span className="flex-1 text-text font-semibold text-sm truncate">
            {entry.pseudo}
            {entry.playerId === currentUserId && (
              <span className="text-xs text-muted-game ml-1">(toi)</span>
            )}
          </span>
          <span className="text-primary-light font-black">{entry.score} pts</span>
        </div>
      ))}
    </div>
  )
}

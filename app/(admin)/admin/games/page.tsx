import { createClient } from '@/lib/supabase/server'
import { Gamepad2 } from 'lucide-react'

export default async function AdminGamesPage() {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('games')
    .select('id, code, mode, status, config, created_at, host_id, profiles:host_id(pseudo)')
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch player counts per game
  const gameIds = (games ?? []).map((g) => g.id)
  const { data: playerCounts } = gameIds.length
    ? await supabase
        .from('game_players')
        .select('game_id')
        .in('game_id', gameIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const p of playerCounts ?? []) {
    countMap[p.game_id] = (countMap[p.game_id] ?? 0) + 1
  }

  const statusColors: Record<string, string> = {
    lobby: 'bg-[#FBBF24]/15 text-[#FBBF24]',
    question: 'bg-[#34D399]/15 text-[#34D399]',
    voting: 'bg-[#34D399]/15 text-[#34D399]',
    reveal: 'bg-[#34D399]/15 text-[#34D399]',
    finished: 'bg-[#484456]/30 text-[#938ea2]',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 size={24} className="text-[#6c3ff5]" />
        <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">
          Parties ({games?.length ?? 0})
        </h1>
      </div>

      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-[#938ea2] uppercase tracking-wider border-b border-[#484456]/20">
              <th className="text-left px-6 py-3">Code</th>
              <th className="text-left px-6 py-3">Mode</th>
              <th className="text-left px-6 py-3">Hôte</th>
              <th className="text-left px-6 py-3">Statut</th>
              <th className="text-left px-6 py-3">Joueurs</th>
              <th className="text-left px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(games ?? []).map((game) => {
              const host = Array.isArray(game.profiles) ? game.profiles[0] : game.profiles
              return (
                <tr key={game.id} className="border-b border-[#484456]/10 hover:bg-[#292937]/50 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-sm text-[#e3e0f4]">{game.code}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      game.mode === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                    }`}>
                      {game.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#cac3d9]">
                    {(host as { pseudo?: string })?.pseudo ?? '?'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[game.status] ?? statusColors.finished}`}>
                      {game.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#cac3d9] font-bold">
                    {countMap[game.id] ?? 0}
                  </td>
                  <td className="px-6 py-3 text-xs text-[#938ea2]">
                    {new Date(game.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              )
            })}
            {(games ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#938ea2] text-sm">
                  Aucune partie trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

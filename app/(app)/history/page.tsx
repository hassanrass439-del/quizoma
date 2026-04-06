import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HistoryClient } from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: games } = await supabase
    .from('game_players')
    .select('game_id, score, joined_at, games(code, mode, status, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(100)

  const entries = (games ?? []).map((gp) => {
    const game = Array.isArray(gp.games) ? gp.games[0] : gp.games
    if (!game) return null
    const g = game as { code: string; mode: string; status: string; created_at: string }
    return {
      gameId: gp.game_id,
      code: g.code,
      mode: g.mode,
      status: g.status,
      score: gp.score,
      createdAt: g.created_at,
    }
  }).filter(Boolean) as Array<{
    gameId: string
    code: string
    mode: string
    status: string
    score: number
    createdAt: string
  }>

  return <HistoryClient entries={entries} />
}

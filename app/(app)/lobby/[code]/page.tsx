import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LobbyClient } from './LobbyClient'

interface Props {
  params: Promise<{ code: string }>
}

export default async function LobbyPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !game) redirect('/dashboard')

  if (game.status !== 'lobby') {
    redirect(`/play/${code}`)
  }

  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, score, profiles(*)')
    .eq('game_id', game.id)

  const profiles = (players ?? [])
    .map((p) => (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles))
    .filter(Boolean)

  return (
    <LobbyClient
      code={code}
      gameId={game.id}
      hostId={game.host_id}
      currentUserId={user.id}
      initialPlayers={profiles as Parameters<typeof LobbyClient>[0]['initialPlayers']}
    />
  )
}

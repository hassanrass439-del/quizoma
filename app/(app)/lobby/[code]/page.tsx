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

  if (!user) redirect(`/login?next=/lobby/${code}`)

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !game) redirect('/dashboard')

  if (game.status !== 'lobby') {
    redirect(`/play/${code}`)
  }

  // Rejoindre automatiquement la partie si pas encore inscrit
  const { count: alreadyIn } = await supabase
    .from('game_players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)
    .eq('user_id', user.id)

  if (!alreadyIn) {
    const { count: playerCount } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id)

    if ((playerCount ?? 0) < 7) {
      await supabase.from('game_players').upsert(
        { game_id: game.id, user_id: user.id },
        { onConflict: 'game_id,user_id' }
      )
    }
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

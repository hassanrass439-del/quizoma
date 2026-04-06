import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResultsClient } from './ResultsClient'

interface Props {
  params: Promise<{ code: string }>
}

export default async function ResultsPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('code', code)
    .single()

  if (!game) redirect('/dashboard')

  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, score, profiles(*)')
    .eq('game_id', game.id)
    .order('score', { ascending: false })

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('game_id', game.id)
    .order('index')

  const ranking = (players ?? []).map((p, i) => ({
    player: (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Parameters<typeof ResultsClient>[0]['ranking'][0]['player'],
    score: p.score,
    rank: i + 1,
  }))

  return (
    <ResultsClient
      code={code}
      gameId={game.id}
      ranking={ranking}
      questions={(questions ?? []) as Parameters<typeof ResultsClient>[0]['questions']}
      isHost={game.host_id === user.id}
      hasSource={!!(game.config as { source_text?: string })?.source_text}
    />
  )
}

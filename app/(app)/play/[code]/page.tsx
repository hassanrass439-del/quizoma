import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlayClient } from './PlayClient'

interface Props {
  params: Promise<{ code: string }>
}

export default async function PlayPage({ params }: Props) {
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

  if (game.status === 'lobby') redirect(`/lobby/${code}`)
  if (game.status === 'finished') redirect(`/results/${code}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, score, profiles(*)')
    .eq('game_id', game.id)

  const gameConfig = game.config as { nb_questions: number; timer_seconds: number; current_question_index?: number }
  const currentQuestionIndex = gameConfig.current_question_index ?? 0

  // Fetch current question based on tracked index in DB
  const { data: currentQuestion, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('game_id', game.id)
    .eq('index', currentQuestionIndex)
    .single()

  // Fallback: if question not found at current index, try any question for this game
  let finalQuestion = currentQuestion
  if (!finalQuestion) {
    const { data: anyQuestion } = await supabase
      .from('questions')
      .select('*')
      .eq('game_id', game.id)
      .order('index', { ascending: true })
      .limit(1)
      .single()
    finalQuestion = anyQuestion
  }

  // Vérifier si le joueur a déjà soumis un bluff / voté pour cette question
  let initialHasSubmittedBluff = false
  let initialHasVoted = false
  if (finalQuestion) {
    const { count: bluffCount } = await supabase
      .from('player_bluffs')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', finalQuestion.id)
      .eq('player_id', user.id)
    initialHasSubmittedBluff = (bluffCount ?? 0) > 0

    const { count: voteCount } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', finalQuestion.id)
      .eq('voter_id', user.id)
    initialHasVoted = (voteCount ?? 0) > 0
  }

  return (
    <PlayClient
      code={code}
      gameId={game.id}
      mode={game.mode as 'bluff' | 'annales'}
      hostId={game.host_id}
      currentUserId={user.id}
      currentProfile={profile}
      initialPlayers={players ?? []}
      totalQuestions={gameConfig.nb_questions}
      timerSeconds={gameConfig.timer_seconds}
      initialStatus={game.status as string}
      initialQuestionIndex={currentQuestionIndex}
      initialQuestionData={finalQuestion ?? null}
      initialHasSubmittedBluff={initialHasSubmittedBluff}
      initialHasVoted={initialHasVoted}
    />
  )
}

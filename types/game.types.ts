export type GameMode = 'bluff' | 'annales'

export type GameStatus = 'lobby' | 'question' | 'voting' | 'reveal' | 'finished'

export interface GameConfig {
  nb_questions: number
  timer_seconds: number
}

export interface Game {
  id: string
  code: string
  host_id: string
  mode: GameMode
  status: GameStatus
  config: GameConfig
  created_at: string
}

export interface Profile {
  id: string
  pseudo: string
  avatar_id: string
  total_games: number
  total_score: number
  created_at: string
}

export interface GamePlayer {
  id: string
  game_id: string
  user_id: string
  score: number
  is_connected: boolean
  joined_at: string
  profile?: Profile
}

export interface Question {
  id: string
  game_id: string
  index: number
  question_text: string
  vraie_reponse: string
  synonymes: string[]
  explication: string | null
  source_chunk: string | null
}

export interface PlayerBluff {
  id: string
  question_id: string
  player_id: string
  bluff_text: string
  submitted_at: string
  profile?: Profile
}

export interface Vote {
  id: string
  question_id: string
  voter_id: string
  voted_for_bluff_id: string | null
  is_correct: boolean
  voted_at: string
}

// Game state broadcast
export interface GameStatePayload {
  status: GameStatus
  question_index: number
  question_data?: Question
}

export interface StartVotePayload {
  answers: Array<{
    id: string
    text: string
    player_id: string | null // null = vraie réponse
  }>
}

export interface RevealPayload {
  correct_answer: string
  bluffs: Array<{
    id: string
    text: string
    author: Profile
    voters: Profile[]
  }>
  scores: Record<string, number>
  explanation: string | null
}

export interface FinalRankingEntry {
  player: Profile
  score: number
  rank: number
}

// Anti-cheat
export interface AntiCheatData {
  vraie_reponse: string
  synonymes: string[]
}

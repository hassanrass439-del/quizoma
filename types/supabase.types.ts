// Auto-generated types placeholder — remplacer avec :
// npx supabase gen types typescript --project-id <id> > types/supabase.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          pseudo: string
          avatar_id: string
          total_games: number
          total_score: number
          created_at: string
        }
        Insert: {
          id: string
          pseudo: string
          avatar_id?: string
          total_games?: number
          total_score?: number
          created_at?: string
        }
        Update: {
          pseudo?: string
          avatar_id?: string
          total_games?: number
          total_score?: number
        }
        Relationships: []
      }
      games: {
        Row: {
          id: string
          code: string
          host_id: string
          mode: 'bluff' | 'annales'
          status: string
          config: Json
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          mode: 'bluff' | 'annales'
          status?: string
          config?: Json
          created_at?: string
        }
        Update: {
          status?: string
          config?: Json
        }
        Relationships: []
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          user_id: string
          score: number
          is_connected: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          score?: number
          is_connected?: boolean
          joined_at?: string
        }
        Update: {
          score?: number
          is_connected?: boolean
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          game_id: string
          index: number
          question_text: string
          vraie_reponse: string
          synonymes: Json
          explication: string | null
          source_chunk: string | null
        }
        Insert: {
          id?: string
          game_id: string
          index: number
          question_text: string
          vraie_reponse: string
          synonymes?: Json
          explication?: string | null
          source_chunk?: string | null
        }
        Update: {
          explication?: string | null
        }
        Relationships: []
      }
      quiz_library: {
        Row: {
          id: string
          owner_id: string
          title: string
          subject: string | null
          mode: 'bluff' | 'annales'
          total_questions: number
          play_count: number
          last_played_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          subject?: string | null
          mode: 'bluff' | 'annales'
          total_questions: number
          play_count?: number
          last_played_at?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          subject?: string | null
          play_count?: number
          last_played_at?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          index: number
          question_text: string
          vraie_reponse: string
          synonymes: Json
          explication: string | null
        }
        Insert: {
          id?: string
          quiz_id: string
          index: number
          question_text: string
          vraie_reponse: string
          synonymes?: Json
          explication?: string | null
        }
        Update: {
          question_text?: string
          vraie_reponse?: string
          synonymes?: Json
          explication?: string | null
        }
        Relationships: []
      }
      player_bluffs: {
        Row: {
          id: string
          question_id: string
          player_id: string
          bluff_text: string
          submitted_at: string
        }
        Insert: {
          id?: string
          question_id: string
          player_id: string
          bluff_text: string
          submitted_at?: string
        }
        Update: { [key: string]: never }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          question_id: string
          voter_id: string
          voted_for_bluff_id: string | null
          is_correct: boolean
          voted_at: string
        }
        Insert: {
          id?: string
          question_id: string
          voter_id: string
          voted_for_bluff_id?: string | null
          is_correct: boolean
          voted_at?: string
        }
        Update: { [key: string]: never }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_player_score: {
        Args: { p_game_id: string; p_user_id: string; p_points: number }
        Returns: undefined
      }
      update_player_stats: {
        Args: { p_user_id: string; p_score: number }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

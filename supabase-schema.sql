-- ═══════════════════════════════════════════════════════════════
-- QUIZOMA — Schéma Supabase
-- Exécuter dans le SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── TABLES PRINCIPALES ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo      VARCHAR(30) NOT NULL,
  avatar_id   VARCHAR(50) DEFAULT 'fox',
  total_games INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(6) NOT NULL UNIQUE,
  host_id     UUID NOT NULL REFERENCES profiles(id),
  mode        VARCHAR(10) NOT NULL CHECK (mode IN ('bluff', 'annales')),
  status      VARCHAR(20) NOT NULL DEFAULT 'lobby'
              CHECK (status IN ('lobby', 'question', 'voting', 'reveal', 'finished')),
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  score        INTEGER DEFAULT 0,
  is_connected BOOLEAN DEFAULT true,
  joined_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  index         INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  vraie_reponse VARCHAR(100) NOT NULL,
  synonymes     JSONB DEFAULT '[]',
  explication   TEXT,
  source_chunk  TEXT,
  UNIQUE(game_id, index)
);

CREATE TABLE IF NOT EXISTS player_bluffs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES profiles(id),
  bluff_text   VARCHAR(200) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, player_id)
);

CREATE TABLE IF NOT EXISTS votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  voter_id            UUID NOT NULL REFERENCES profiles(id),
  voted_for_bluff_id  UUID REFERENCES player_bluffs(id),
  is_correct          BOOLEAN NOT NULL,
  voted_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, voter_id)
);

-- ── INDEX PERFORMANCES ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_questions_game_id_index ON questions(game_id, index);
CREATE INDEX IF NOT EXISTS idx_player_bluffs_question_id ON player_bluffs(question_id);
CREATE INDEX IF NOT EXISTS idx_votes_question_id ON votes(question_id, voter_id);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_bluffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Profils : lecture publique, modification par le propriétaire
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Parties : lecture publique
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY "games_update" ON games FOR UPDATE USING (host_id = auth.uid());

-- Joueurs : lecture publique
CREATE POLICY "game_players_select" ON game_players FOR SELECT USING (true);
CREATE POLICY "game_players_insert" ON game_players FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "game_players_update" ON game_players FOR UPDATE USING (user_id = auth.uid());

-- Questions : lecture par les joueurs de la partie
CREATE POLICY "questions_select" ON questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM game_players gp
    WHERE gp.game_id = questions.game_id
    AND gp.user_id = auth.uid()
  )
);

-- Bluffs : visibles uniquement en phase vote/reveal/finished
CREATE POLICY "bluffs_visible_after_submission" ON player_bluffs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN questions q ON q.game_id = g.id
      WHERE q.id = player_bluffs.question_id
      AND g.status IN ('voting', 'reveal', 'finished')
    )
  );

CREATE POLICY "bluffs_insert" ON player_bluffs FOR INSERT WITH CHECK (player_id = auth.uid());

-- Votes : lecture par les joueurs
CREATE POLICY "votes_select" ON votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions q
    JOIN game_players gp ON gp.game_id = q.game_id
    WHERE q.id = votes.question_id
    AND gp.user_id = auth.uid()
  )
);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (voter_id = auth.uid());

-- ── FUNCTIONS & TRIGGERS ───────────────────────────────────────

-- Créer automatiquement un profil vide à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Joueur'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Incrémenter le score d'un joueur
CREATE OR REPLACE FUNCTION increment_player_score(
  p_game_id UUID,
  p_user_id UUID,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE game_players
  SET score = score + p_points
  WHERE game_id = p_game_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour les stats globales du joueur
CREATE OR REPLACE FUNCTION update_player_stats(
  p_user_id UUID,
  p_score INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    total_games = total_games + 1,
    total_score = total_score + p_score
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── REALTIME ───────────────────────────────────────────────────

-- Activer Realtime sur les tables nécessaires
-- Dans Supabase Dashboard → Database → Replication
-- Activer pour : games, game_players

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { JoinGameForm } from '@/components/dashboard/JoinGameForm'
import { getAvatar, avatarUrl } from '@/lib/avatars'
import Image from 'next/image'
import { Plus, BookOpen, Gamepad2, Trophy, ChevronRight, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: recentGames } = await supabase
    .from('game_players')
    .select('game_id, score, joined_at, games(code, mode, status, created_at)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(3)

  const avatar = getAvatar(profile.avatar_id)
  const avgScore = profile.total_games > 0
    ? Math.round(profile.total_score / profile.total_games)
    : 0

  return (
    <div className="flex flex-col min-h-full bg-surface-1">

      {/* Header hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-surface-2 to-surface-1 px-4 pt-12 pb-6">
        {/* Déco background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <Link href="/profile">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-surface-1 shrink-0">
              <Image
                src={avatarUrl(avatar.seed, avatar.bg, 128)}
                alt={avatar.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-muted-game text-xs font-semibold uppercase tracking-wider">Bonjour 👋</p>
            <h1 className="text-2xl font-black text-text truncate">{profile.pseudo}</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <Sparkles size={12} className="text-warning" />
              <p className="text-muted-game text-xs">{profile.total_games} partie{profile.total_games !== 1 ? 's' : ''} jouée{profile.total_games !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Stats mini */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: 'Parties', value: profile.total_games, icon: Gamepad2, color: 'text-primary-light', bg: 'bg-primary/10' },
            { label: 'Score', value: profile.total_score, icon: Trophy, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Moyenne', value: avgScore, icon: Sparkles, color: 'text-success', bg: 'bg-success/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
              <Icon size={16} className={`${color} mx-auto mb-1`} />
              <p className="text-text font-black text-xl leading-none">{value}</p>
              <p className="text-muted-game text-[10px] font-semibold mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-6">

        {/* Rejoindre une partie */}
        <div className="space-y-3">
          <h2 className="text-text font-black text-base flex items-center gap-2">
            Rejoindre une partie
          </h2>
          <JoinGameForm />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h2 className="text-text font-black text-base">Créer</h2>

          <Link href="/create">
            <div className="w-full flex items-center gap-4 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4 hover:border-primary/60 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shrink-0">
                <Plus size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-text font-bold">Nouvelle partie</p>
                <p className="text-muted-game text-xs mt-0.5">Importer un cours, générer avec l&apos;IA</p>
              </div>
              <ChevronRight size={18} className="text-muted-game" />
            </div>
          </Link>

          <Link href="/library">
            <div className="w-full flex items-center gap-4 bg-surface-2 border border-game-border rounded-2xl p-4 hover:border-primary/30 transition-all active:scale-[0.98] mt-2">
              <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center shrink-0">
                <BookOpen size={22} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-text font-bold">Ma bibliothèque</p>
                <p className="text-muted-game text-xs mt-0.5">Rejouer un quiz sauvegardé</p>
              </div>
              <ChevronRight size={18} className="text-muted-game" />
            </div>
          </Link>
        </div>

        {/* Historique */}
        {recentGames && recentGames.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-text font-black text-base">Parties récentes</h2>
            <div className="space-y-2">
              {recentGames.map((gp) => {
                const game = Array.isArray(gp.games) ? gp.games[0] : gp.games
                if (!game) return null
                const g = game as { code: string; mode: string; status: string }
                const isFinished = g.status === 'finished'
                return (
                  <Link
                    key={gp.game_id}
                    href={isFinished ? `/results/${g.code}` : `/lobby/${g.code}`}
                    className="bg-surface-2 border border-game-border rounded-2xl px-4 py-3 flex items-center justify-between hover:border-primary/40 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                        g.mode === 'bluff' ? 'bg-primary/15' : 'bg-accent/15'
                      }`}>
                        {g.mode === 'bluff' ? '🎭' : '📝'}
                      </div>
                      <div>
                        <p className="text-text font-bold font-mono text-sm tracking-wider">{g.code}</p>
                        <p className="text-muted-game text-xs capitalize">Mode {g.mode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-primary-light font-black">{gp.score} pts</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isFinished
                          ? 'bg-success/15 text-success'
                          : 'bg-warning/15 text-warning'
                      }`}>
                        {isFinished ? 'Terminée' : 'En cours'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

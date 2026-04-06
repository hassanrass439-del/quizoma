import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { JoinGameForm } from '@/components/dashboard/JoinGameForm'
import { getAvatar, avatarUrl } from '@/lib/avatars'
import Image from 'next/image'
import { ChevronRight, BookOpen, Gamepad2, Trophy, TrendingUp, Bell, Plus } from 'lucide-react'

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
    <div className="min-h-full bg-[#12121f] pb-32 radial-glow">

      {/* Header */}
      <header className="flex justify-between items-center w-full px-6 py-8">
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <div className="w-12 h-12 rounded-full bg-surface-3 overflow-hidden border-2 border-[#6c3ff5]/20">
              <Image
                src={avatarUrl(avatar.seed, avatar.bg, 96)}
                alt={avatar.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </Link>
          <div className="flex flex-col">
            <span className="text-[13px] text-text-muted leading-none">Bonsoir,</span>
            <span className="text-[20px] font-black text-text font-headline tracking-tight">
              {profile.pseudo}
            </span>
          </div>
        </div>
        <Link href="/profile" className="w-11 h-11 flex items-center justify-center bg-surface-2 rounded-xl text-text hover:bg-surface-3 transition-colors">
          <Bell size={20} />
        </Link>
      </header>

      <main className="px-6 space-y-8">

        {/* Stats Row */}
        <div className="flex gap-3">
          {[
            { value: profile.total_games, label: 'Parties', icon: Gamepad2, color: '#6c3ff5' },
            { value: profile.total_score, label: 'Points', icon: Trophy, color: '#45dfa4' },
            { value: avgScore, label: 'Moyenne', icon: TrendingUp, color: '#ffb59d' },
          ].map(({ value, label, icon: Icon, color }) => (
            <div key={label} className="flex-1 bg-gradient-to-b from-[#1e1e2c] to-[#16162a] border border-[#484456]/30 rounded-xl px-2 py-3 flex flex-col items-center gap-1">
              <Icon size={16} style={{ color }} />
              <span className="text-xl font-black font-headline leading-none text-[#e3e0f4]">{value}</span>
              <span className="text-[9px] uppercase tracking-[0.12em] text-[#938ea2] font-bold">{label}</span>
            </div>
          ))}
        </div>

        {/* Primary CTA — Créer une partie */}
        <Link href="/create">
          <section className="relative overflow-hidden h-[140px] rounded-[18px] bg-gradient-to-br from-[#6c3ff5] to-[#340098] p-6 flex items-center justify-between shadow-[0_12px_30px_-10px_rgba(108,63,245,0.4)] active:scale-[0.98] transition-transform">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                <path d="M0 0 L100 100 M100 0 L0 100" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="50" cy="50" fill="none" r="40" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            <div className="relative z-10 flex flex-col justify-center">
              <h2 className="text-2xl font-extrabold text-[#e9e1ff] font-headline tracking-tight">Créer une partie</h2>
              <p className="text-[#e9e1ff]/70 text-sm mt-1">Importe tes notes, l&apos;IA fait le reste</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Plus size={32} className="text-[#e9e1ff]" />
            </div>
          </section>
        </Link>

        {/* Secondary — Rejoindre */}
        <section className="mt-4 rounded-[18px] bg-surface-2 border-[1.5px] border-dashed border-[#6c3ff5]/50 px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen size={20} className="text-[#6c3ff5]" />
            <span className="font-bold text-lg text-text font-headline">Rejoindre avec un code</span>
          </div>
          <JoinGameForm />
        </section>

        {/* Ma bibliothèque */}
        <Link href="/library">
          <section className="group h-[72px] rounded-[18px] bg-surface-2 border-[1.5px] border-[#484456]/40 px-5 flex items-center justify-between hover:bg-surface-3 hover:border-[#6c3ff5]/40 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <BookOpen size={24} className="text-[#cbbeff]" />
              <span className="font-bold text-lg text-text font-headline">Ma bibliothèque</span>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </section>
        </Link>

        {/* Parties récentes */}
        {recentGames && recentGames.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-end">
              <h3 className="text-xl font-bold text-text font-headline">Parties récentes</h3>
              <Link href="/results" className="text-primary-tint text-sm font-semibold hover:underline">Tout voir</Link>
            </div>
            <div className="space-y-4">
              {recentGames.map((gp) => {
                const game = Array.isArray(gp.games) ? gp.games[0] : gp.games
                if (!game) return null
                const g = game as { code: string; mode: string; status: string }
                const isFinished = g.status === 'finished'
                return (
                  <Link
                    key={gp.game_id}
                    href={isFinished ? `/results/${g.code}` : `/lobby/${g.code}`}
                    className="bg-surface-3 rounded-[18px] p-4 flex flex-col gap-3 shadow-lg block"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black font-headline ${
                          g.mode === 'bluff'
                            ? 'bg-[#6c3ff5]/20 text-[#e7deff]'
                            : 'bg-[#b83900]/20 text-[#ffb59d]'
                        }`}>
                          {g.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-text text-base font-mono tracking-wider">{g.code}</span>
                          <span className="text-xs text-text-muted capitalize">Mode {g.mode}</span>
                        </div>
                      </div>
                      <div className="bg-[#007551]/30 text-[#45dfa4] px-3 py-1 rounded-full text-xs font-bold">
                        +{gp.score} pts
                      </div>
                    </div>
                    <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary-tint h-full rounded-full shadow-[0_0_8px_rgba(203,190,255,0.4)]"
                        style={{ width: isFinished ? '100%' : '50%' }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/admin/KpiCard'
import { Users, Gamepad2, BookOpen, DollarSign, Zap, CheckCircle, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // KPIs
  const [
    { count: totalUsers },
    { count: totalGames },
    { count: liveGames },
    { count: totalQuizzes },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('games').select('*', { count: 'exact', head: true }),
    supabase.from('games').select('*', { count: 'exact', head: true }).eq('status', 'lobby').or('status.eq.question,status.eq.voting,status.eq.reveal'),
    supabase.from('quiz_library').select('*', { count: 'exact', head: true }),
  ])

  // Parties récentes
  const { data: recentGames } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  // Utilisateurs récents
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">Vue d&apos;ensemble</h1>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Utilisateurs"
          value={totalUsers ?? 0}
          color="#6C3FF5"
          bgColor="rgba(108,63,245,0.12)"
        />
        <KpiCard
          icon={Gamepad2}
          label="Parties"
          value={totalGames ?? 0}
          change={`${liveGames ?? 0} en cours`}
          changeType="up"
          color="#34D399"
          bgColor="rgba(52,211,153,0.12)"
        />
        <KpiCard
          icon={BookOpen}
          label="Quiz créés"
          value={totalQuizzes ?? 0}
          color="#60A5FA"
          bgColor="rgba(96,165,250,0.12)"
        />
        <KpiCard
          icon={DollarSign}
          label="Coût API (estimation)"
          value="~$0"
          color="#FBBF24"
          bgColor="rgba(251,191,36,0.12)"
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard icon={Zap} label="Parties/jour (moy.)" value={Math.round((totalGames ?? 0) / 30)} color="#6C3FF5" bgColor="rgba(108,63,245,0.08)" />
        <KpiCard icon={CheckCircle} label="Taux complétion" value="--%" color="#34D399" bgColor="rgba(52,211,153,0.08)" />
        <KpiCard icon={HelpCircle} label="Questions/partie (moy.)" value="10" color="#60A5FA" bgColor="rgba(96,165,250,0.08)" />
      </div>

      {/* Parties récentes */}
      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#484456]/30 flex items-center justify-between">
          <h2 className="font-bold text-[#e3e0f4] font-headline">Parties récentes</h2>
          <Link href="/admin/games" className="text-xs text-[#6c3ff5] hover:underline font-bold">Voir toutes →</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-[#938ea2] uppercase tracking-wider border-b border-[#484456]/20">
              <th className="text-left px-6 py-3">Code</th>
              <th className="text-left px-6 py-3">Mode</th>
              <th className="text-left px-6 py-3">Hôte</th>
              <th className="text-left px-6 py-3">Statut</th>
              <th className="text-left px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(recentGames ?? []).map((game) => {
              const host = { pseudo: game.host_id?.slice(0, 8) ?? '?' }
              const statusColors: Record<string, string> = {
                lobby: 'bg-[#FBBF24]/15 text-[#FBBF24]',
                question: 'bg-[#34D399]/15 text-[#34D399]',
                voting: 'bg-[#34D399]/15 text-[#34D399]',
                reveal: 'bg-[#34D399]/15 text-[#34D399]',
                finished: 'bg-[#484456]/30 text-[#938ea2]',
              }
              return (
                <tr key={game.id} className="border-b border-[#484456]/10 hover:bg-[#292937]/50 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-sm text-[#e3e0f4]">{game.code}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      game.mode === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                    }`}>
                      {game.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#cac3d9] font-mono">{host.pseudo}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[game.status] ?? statusColors.finished}`}>
                      {game.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-[#938ea2]">
                    {new Date(game.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Utilisateurs récents */}
      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#484456]/30 flex items-center justify-between">
          <h2 className="font-bold text-[#e3e0f4] font-headline">Derniers inscrits</h2>
          <Link href="/admin/users" className="text-xs text-[#6c3ff5] hover:underline font-bold">Voir tous →</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-[#938ea2] uppercase tracking-wider border-b border-[#484456]/20">
              <th className="text-left px-6 py-3">Pseudo</th>
              <th className="text-left px-6 py-3">Parties</th>
              <th className="text-left px-6 py-3">Score</th>
              <th className="text-left px-6 py-3">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {(recentUsers ?? []).map((u) => (
              <tr key={u.id} className="border-b border-[#484456]/10 hover:bg-[#292937]/50 transition-colors">
                <td className="px-6 py-3 font-bold text-sm text-[#e3e0f4]">{u.pseudo}</td>
                <td className="px-6 py-3 text-sm text-[#cac3d9]">{u.total_games}</td>
                <td className="px-6 py-3 text-sm text-[#cbbeff] font-bold">{u.total_score}</td>
                <td className="px-6 py-3 text-xs text-[#938ea2]">
                  {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

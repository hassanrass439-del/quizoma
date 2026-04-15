'use client'

import { useState } from 'react'
import { Search, Shield, Crown, User as UserIcon } from 'lucide-react'
import { updateUserRole, banUser } from '../../actions'
import { toast } from 'sonner'

interface UserRow {
  id: string
  pseudo: string
  avatar_id: string
  role: string
  total_games: number
  total_score: number
  created_at: string
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filtered = users.filter((u) => {
    if (search && !u.pseudo.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  async function handleRoleChange(userId: string, role: 'user' | 'moderator' | 'admin') {
    try {
      await updateUserRole(userId, role)
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur')
    }
  }

  async function handleBan(userId: string) {
    const reason = prompt('Raison du bannissement :')
    if (!reason) return
    try {
      await banUser(userId, reason, 30)
      toast.success('Utilisateur banni 30 jours')
    } catch {
      toast.error('Erreur')
    }
  }

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F87171]/15 text-[#F87171]"><Crown size={10} className="inline mr-1" />Admin</span>
      case 'moderator': return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#60A5FA]/15 text-[#60A5FA]"><Shield size={10} className="inline mr-1" />Mod</span>
      default: return <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#484456]/30 text-[#938ea2]"><UserIcon size={10} className="inline mr-1" />User</span>
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">Utilisateurs ({users.length})</h1>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#938ea2]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un pseudo..."
            className="w-full bg-[#1e1e2c] border border-[#484456]/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e3e0f4] placeholder:text-[#938ea2] focus:outline-none focus:border-[#6c3ff5]/60"
          />
        </div>
        {['all', 'user', 'moderator', 'admin'].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roleFilter === r ? 'bg-[#6c3ff5] text-white' : 'bg-[#1e1e2c] text-[#938ea2] border border-[#484456]/40'
            }`}
          >
            {r === 'all' ? 'Tous' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-[#938ea2] uppercase tracking-wider border-b border-[#484456]/20">
              <th className="text-left px-6 py-3">Utilisateur</th>
              <th className="text-left px-6 py-3">Rôle</th>
              <th className="text-left px-6 py-3">Parties</th>
              <th className="text-left px-6 py-3">Score</th>
              <th className="text-left px-6 py-3">Inscrit</th>
              <th className="text-left px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-[#484456]/10 hover:bg-[#292937]/50 transition-colors">
                <td className="px-6 py-3">
                  <p className="font-bold text-sm text-[#e3e0f4]">{u.pseudo}</p>
                  <p className="text-[10px] text-[#938ea2] font-mono">{u.id.slice(0, 8)}...</p>
                </td>
                <td className="px-6 py-3">{roleBadge(u.role)}</td>
                <td className="px-6 py-3 text-sm text-[#cac3d9]">{u.total_games}</td>
                <td className="px-6 py-3 text-sm text-[#cbbeff] font-bold">{u.total_score}</td>
                <td className="px-6 py-3 text-xs text-[#938ea2]">
                  {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-1">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as 'user' | 'moderator' | 'admin')}
                      className="bg-[#292937] text-[#e3e0f4] text-xs rounded-lg px-2 py-1 border border-[#484456]/30"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Mod</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleBan(u.id)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-[#F87171]/15 text-[#F87171] hover:bg-[#F87171]/25 font-bold"
                    >
                      Ban
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

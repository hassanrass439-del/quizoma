import { createClient } from '@/lib/supabase/server'
import { UsersClient } from './UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Cast car 'role' n'est pas dans les types générés
  const usersWithRole = (users ?? []).map((u) => ({
    id: u.id,
    pseudo: u.pseudo,
    avatar_id: u.avatar_id,
    role: (u as unknown as Record<string, string>).role ?? 'user',
    total_games: u.total_games,
    total_score: u.total_score,
    created_at: u.created_at,
  }))

  return <UsersClient users={usersWithRole} />
}

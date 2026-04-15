import { createClient } from '@/lib/supabase/server'
import { UsersClient } from './UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, pseudo, avatar_id, role, total_games, total_score, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return <UsersClient users={users ?? []} />
}

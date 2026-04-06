import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <ProfileClient
      profile={{
        id: profile.id,
        pseudo: profile.pseudo,
        avatar_id: profile.avatar_id,
        total_games: profile.total_games,
        total_score: profile.total_score,
        created_at: profile.created_at,
      }}
      email={user.email ?? ''}
    />
  )
}

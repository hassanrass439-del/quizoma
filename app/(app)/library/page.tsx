import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { LibraryClient } from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quizzes } = await supabase
    .from('quiz_library')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader title="Ma Bibliothèque 📚" backHref="/dashboard" />
      <LibraryClient initialQuizzes={quizzes ?? []} />
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Si déjà connecté, rediriger vers le dashboard
  if (user) redirect('/dashboard')

  return (
    <div className="flex justify-center min-h-dvh">
      <div className="relative w-full max-w-[430px] min-h-dvh bg-[#12121f] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.6)]" style={{ transform: 'translateZ(0)' }}>
        {children}
      </div>
    </div>
  )
}

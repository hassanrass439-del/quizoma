import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pseudo, avatar_id')
          .eq('id', user.id)
          .maybeSingle()

        // Forcer onboarding si demandé ou si profil incomplet
        const needsOnboarding =
          next === '/onboarding' ||
          !profile ||
          !profile.pseudo ||
          profile.pseudo === 'Joueur' ||
          !profile.avatar_id

        if (needsOnboarding) {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
      }
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', req.url))
}

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
      // Vérifier si le profil existe (première connexion → onboarding)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pseudo, avatar_id')
          .eq('id', user.id)
          .maybeSingle()

        // Première connexion Google : created_at ≈ last_sign_in_at (écart < 10s)
        const createdAt = new Date(user.created_at).getTime()
        const lastSignIn = new Date(user.last_sign_in_at ?? user.created_at).getTime()
        const isFirstLogin = Math.abs(lastSignIn - createdAt) < 10000

        const needsOnboarding =
          !profile ||
          !profile.pseudo ||
          profile.pseudo === 'Joueur' ||
          !profile.avatar_id ||
          isFirstLogin

        if (needsOnboarding) {
          const onboardingUrl = next !== '/dashboard'
            ? `/onboarding?next=${encodeURIComponent(next)}`
            : '/onboarding'
          return NextResponse.redirect(new URL(onboardingUrl, req.url))
        }
      }
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', req.url))
}

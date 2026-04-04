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
          .select('pseudo')
          .eq('id', user.id)
          .single()

        if (!profile?.pseudo || profile.pseudo === 'Joueur') {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
      }
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', req.url))
}

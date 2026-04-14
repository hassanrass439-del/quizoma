import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  console.log('[auth/callback] code:', code ? 'present' : 'MISSING')
  console.log('[auth/callback] next:', next)
  console.log('[auth/callback] origin:', origin)
  console.log('[auth/callback] req.url:', req.url)

  if (!code) {
    console.log('[auth/callback] No code → redirect to login')
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCode error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  console.log('[auth/callback] Session exchange OK')

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('[auth/callback] user:', user?.id ?? 'NULL', '| email:', user?.email ?? 'NULL')
  if (userError) console.error('[auth/callback] getUser error:', userError.message)

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('pseudo, avatar_id')
      .eq('id', user.id)
      .maybeSingle()

    console.log('[auth/callback] profile:', profile ? `pseudo=${profile.pseudo}, avatar=${profile.avatar_id}` : 'NULL')
    if (profileError) console.error('[auth/callback] profile error:', profileError.message)

    const needsOnboarding =
      !profile ||
      !profile.pseudo ||
      profile.pseudo === 'Joueur' ||
      !profile.avatar_id

    console.log('[auth/callback] needsOnboarding:', needsOnboarding)

    if (needsOnboarding) {
      const url = `${origin}/onboarding`
      console.log('[auth/callback] → redirect to:', url)
      return NextResponse.redirect(url)
    }
  }

  const url = `${origin}${next}`
  console.log('[auth/callback] → redirect to:', url)
  return NextResponse.redirect(url)
}

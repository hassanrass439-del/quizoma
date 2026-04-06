import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const origin = req.headers.get('origin') || req.nextUrl.origin
  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}

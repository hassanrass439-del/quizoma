import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { channel } = await req.json()
    if (!channel) return NextResponse.json({ error: 'Channel requis' }, { status: 400 })

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
    const appCertificate = process.env.AGORA_APP_CERTIFICATE

    // UID basé sur un hash du user id (Agora UID doit être un number)
    const uid = Math.abs(hashCode(user.id)) % 100000000

    if (!appId || !appCertificate || appCertificate.length < 32) {
      // Mode APP ID (testing) : pas de token
      return NextResponse.json({ token: null, uid })
    }

    // Token expire dans 1 heure
    const expireTime = Math.floor(Date.now() / 1000) + 3600

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      uid,
      RtcRole.PUBLISHER,
      expireTime
    )

    return NextResponse.json({ token, uid })
  } catch (err) {
    console.error('Error generating Agora token:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

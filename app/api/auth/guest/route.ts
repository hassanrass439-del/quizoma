import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ALL_AVATARS } from '@/lib/avatars'
import { randomUUID } from 'crypto'

const ADJECTIVES = ['Brave', 'Agile', 'Rapide', 'Malin', 'Ruse', 'Fute', 'Vif', 'Calme', 'Sage', 'Fort']
const NOUNS = ['Carabin', 'Docteur', 'Externe', 'Interne', 'Etudiant', 'Medecin', 'Chercheur', 'Prof', 'Pharma', 'Dentiste']

function generateGuestPseudo(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}${noun}${num}`
}

function randomAvatar(): string {
  return ALL_AVATARS[Math.floor(Math.random() * ALL_AVATARS.length)].id
}

export async function POST() {
  try {
    const serviceSupabase = createServiceClient()

    // Créer un utilisateur invité avec email fictif auto-confirmé
    const guestId = randomUUID().slice(0, 8)
    const email = `guest_${guestId}@quizoma.guest`
    const password = randomUUID()

    const { data: userData, error: createErr } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_guest: true },
    })

    if (createErr || !userData.user) {
      console.error('[guest] create user error:', createErr)
      return NextResponse.json({ error: 'Erreur création invité' }, { status: 500 })
    }

    // Créer le profil
    const pseudo = generateGuestPseudo()
    const avatarId = randomAvatar()

    await serviceSupabase.from('profiles').upsert({
      id: userData.user.id,
      pseudo,
      avatar_id: avatarId,
    })

    // Connecter l'invité dans la session courante
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (signInErr) {
      console.error('[guest] sign in error:', signInErr)
      return NextResponse.json({ error: 'Erreur connexion invité' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, pseudo })
  } catch (err) {
    console.error('Error creating guest:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

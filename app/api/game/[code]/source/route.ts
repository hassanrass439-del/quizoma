import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ code: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('host_id, mode, config')
    .eq('code', code)
    .single()

  if (!game) return NextResponse.json({ error: 'Partie introuvable' }, { status: 404 })
  if (game.host_id !== user.id) return NextResponse.json({ error: 'Hôte uniquement' }, { status: 403 })

  const config = game.config as {
    source_text?: string
    chapters?: Array<{ title: string; startIndex: number; endIndex: number }>
  }

  if (!config.source_text) {
    return NextResponse.json({ error: 'Texte source non disponible' }, { status: 404 })
  }

  return NextResponse.json({
    mode: game.mode,
    text: config.source_text,
    chapters: config.chapters ?? [],
  })
}

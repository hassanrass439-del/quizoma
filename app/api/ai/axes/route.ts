import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractAxes } from '@/lib/ai/extractAxes'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })

    const axes = await extractAxes(text)

    const chapters = axes.map((axe) => {
      const searchKey = axe.titre.replace(/^[IVX]+\.\s*/i, '').slice(0, 30).toLowerCase()
      const idx = text.toLowerCase().indexOf(searchKey)
      return {
        title: axe.titre,
        startIndex: idx >= 0 ? idx : 0,
        endIndex: text.length,
      }
    })
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].endIndex = chapters[i + 1].startIndex > 0 ? chapters[i + 1].startIndex : chapters[i].endIndex
    }

    return NextResponse.json({ chapters })
  } catch (err) {
    console.error('[Axes route] error:', err)
    return NextResponse.json({ error: 'Erreur extraction axes' }, { status: 500 })
  }
}

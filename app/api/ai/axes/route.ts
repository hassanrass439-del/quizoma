import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractAxes } from '@/lib/ai/extractAxes'

export const maxDuration = 60

/**
 * Cherche la position d'un titre dans le texte de manière flexible.
 * Essaie plusieurs variantes : titre complet, sans numérotation, premiers mots...
 */
function findTitlePosition(text: string, title: string): number {
  const lower = text.toLowerCase()

  // 1. Essai exact
  let idx = lower.indexOf(title.toLowerCase())
  if (idx >= 0) return idx

  // 2. Sans numérotation (I., II., 1., A., etc.)
  const withoutNum = title.replace(/^[IVX0-9]+\.\s*/i, '').trim()
  idx = lower.indexOf(withoutNum.toLowerCase())
  if (idx >= 0) return idx

  // 3. Premier mot significatif (>5 chars) du titre
  const words = withoutNum.split(/\s+/).filter((w) => w.length > 4)
  if (words.length > 0) {
    // Cherche le premier mot significatif suivi du contexte
    const firstSignificant = words[0].toLowerCase()
    idx = lower.indexOf(firstSignificant)
    if (idx >= 0) return idx
  }

  // 4. Essai avec les 2 premiers mots
  const twoWords = withoutNum.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
  if (twoWords.length > 5) {
    idx = lower.indexOf(twoWords)
    if (idx >= 0) return idx
  }

  return -1
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })

    const axes = await extractAxes(text)

    // Dédupliquer les axes (même titre de base → garder le premier)
    const seen = new Set<string>()
    const uniqueAxes = axes.filter((axe) => {
      const key = axe.titre.replace(/^[IVX0-9]+\.\s*/i, '').trim().toLowerCase().split(/\s*[:–\-—]\s*/)[0]
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Trouver les positions dans le texte
    const chapters = uniqueAxes.map((axe) => {
      const idx = findTitlePosition(text, axe.titre)
      return {
        title: axe.titre,
        startIndex: idx >= 0 ? idx : 0,
        endIndex: text.length,
      }
    })

    // Trier par startIndex pour être sûr de l'ordre
    chapters.sort((a, b) => a.startIndex - b.startIndex)

    // Recalculer endIndex
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].endIndex = chapters[i + 1].startIndex
    }

    // Filtrer les axes avec startIndex = 0 sauf le premier (probablement pas trouvés)
    const filtered = chapters.filter((c, i) => i === 0 || c.startIndex > 0)

    return NextResponse.json({ chapters: filtered })
  } catch (err) {
    console.error('[Axes route] error:', err)
    return NextResponse.json({ error: 'Erreur extraction axes' }, { status: 500 })
  }
}

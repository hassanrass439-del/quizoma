import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPT_AXES } from '@/lib/ai/prompts'

export const runtime = 'edge'

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })

    const truncated = text.slice(0, 12000)
    const apiKey = process.env.GEMINI_API_KEY

    let axes: Array<{ id: number; titre: string; debut_exact: string }> = []

    // Appeler Gemini avec fallback multi-modèle
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT_AXES }] },
              contents: [{ role: 'user', parts: [{ text: truncated }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
          }
        )

        if (res.status === 503 || res.status === 429) continue
        if (!res.ok) continue

        const data = await res.json()
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const parsed = JSON.parse(raw)
        axes = parsed.axes_principaux ?? []
        break
      } catch {
        continue
      }
    }

    if (axes.length === 0) {
      return NextResponse.json({ chapters: [] })
    }

    // Dédupliquer
    const seen = new Set<string>()
    const uniqueAxes = axes.filter((axe) => {
      const key = axe.titre.replace(/^[IVX0-9]+\.\s*/i, '').trim().toLowerCase().split(/\s*[:–\-—]\s*/)[0]
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const lower = text.toLowerCase()

    // Trouver les positions grâce aux empreintes (debut_exact)
    const chapters = uniqueAxes.map((axe) => {
      let startIndex = -1

      // 1. Chercher avec debut_exact (le plus fiable)
      if (axe.debut_exact && axe.debut_exact.length > 10) {
        startIndex = lower.indexOf(axe.debut_exact.toLowerCase())
      }

      // 2. Fallback : chercher le titre dans le texte
      if (startIndex < 0) {
        startIndex = lower.indexOf(axe.titre.toLowerCase())
      }

      // 3. Fallback : chercher le titre sans numérotation
      if (startIndex < 0) {
        const withoutNum = axe.titre.replace(/^[IVX0-9]+\.\s*/i, '').trim().toLowerCase()
        startIndex = lower.indexOf(withoutNum)
      }

      // 4. Fallback : premier mot significatif
      if (startIndex < 0) {
        const words = axe.titre.replace(/^[IVX0-9]+\.\s*/i, '').trim().split(/\s+/).filter((w) => w.length > 4)
        if (words.length > 0) {
          startIndex = lower.indexOf(words[0].toLowerCase())
        }
      }

      return {
        title: axe.titre,
        startIndex: startIndex >= 0 ? startIndex : 0,
        endIndex: text.length,
      }
    })

    // Trier par position dans le texte
    chapters.sort((a, b) => a.startIndex - b.startIndex)

    // Chaque axe finit où le suivant commence
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].endIndex = chapters[i + 1].startIndex
    }

    // Filtrer les axes non trouvés (startIndex = 0 sauf le premier)
    const filtered = chapters.filter((c, i) => i === 0 || c.startIndex > 0)

    return NextResponse.json({ chapters: filtered })
  } catch {
    return NextResponse.json({ error: 'Erreur extraction axes' }, { status: 500 })
  }
}

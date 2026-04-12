import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPT_AXES } from '@/lib/ai/prompts'

export const runtime = 'edge'

function findTitlePosition(text: string, title: string): number {
  const lower = text.toLowerCase()

  let idx = lower.indexOf(title.toLowerCase())
  if (idx >= 0) return idx

  const withoutNum = title.replace(/^[IVX0-9]+\.\s*/i, '').trim()
  idx = lower.indexOf(withoutNum.toLowerCase())
  if (idx >= 0) return idx

  const words = withoutNum.split(/\s+/).filter((w) => w.length > 4)
  if (words.length > 0) {
    idx = lower.indexOf(words[0].toLowerCase())
    if (idx >= 0) return idx
  }

  const twoWords = withoutNum.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
  if (twoWords.length > 5) {
    idx = lower.indexOf(twoWords)
    if (idx >= 0) return idx
  }

  return -1
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'Texte requis' }, { status: 400 })

    const truncated = text.slice(0, 8000)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur extraction axes' }, { status: 500 })
    }

    const data = await res.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let axes: Array<{ id: number; titre: string }> = []
    try {
      const parsed = JSON.parse(raw)
      axes = parsed.axes_principaux ?? []
    } catch {
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

    // Positions
    const chapters = uniqueAxes.map((axe) => {
      const idx = findTitlePosition(text, axe.titre)
      return { title: axe.titre, startIndex: idx >= 0 ? idx : 0, endIndex: text.length }
    })

    chapters.sort((a, b) => a.startIndex - b.startIndex)
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].endIndex = chapters[i + 1].startIndex
    }

    const filtered = chapters.filter((c, i) => i === 0 || c.startIndex > 0)
    return NextResponse.json({ chapters: filtered })
  } catch {
    return NextResponse.json({ error: 'Erreur extraction axes' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { SYSTEM_PROMPT_MODE1 } from '@/lib/ai/prompts'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { chunk, count } = await req.json()
    if (!chunk) return NextResponse.json({ error: 'Chunk requis' }, { status: 400 })

    const prompt = SYSTEM_PROMPT_MODE1.replace('exactement 3 questions', `exactement ${count ?? 3} questions`)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: 'user', parts: [{ text: chunk }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur Gemini', questions: [] }, { status: 500 })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json({ questions: parsed.questions_generees ?? [] })
    } catch {
      return NextResponse.json({ questions: [] })
    }
  } catch {
    return NextResponse.json({ error: 'Erreur', questions: [] }, { status: 500 })
  }
}

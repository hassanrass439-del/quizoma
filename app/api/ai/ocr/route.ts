import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Encode base64 par chunks pour éviter stack overflow sur Edge
    let base64 = ''
    const chunkSize = 32768
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      base64 += String.fromCharCode(...chunk)
    }
    base64 = btoa(base64)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: base64 } },
              { text: 'Extrais tout le texte de ce document PDF de manière fidèle et complète. Conserve exactement la structure : numérotation des questions, propositions A/B/C/D/E, cas cliniques, tableaux. Ne résume rien, ne reformule rien, ne commente rien. Renvoie UNIQUEMENT le texte brut extrait, ligne par ligne.' },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('[OCR Edge] Gemini error:', res.status, errText.slice(0, 300))
      return NextResponse.json({ error: `Erreur OCR: ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[OCR Edge] error:', err)
    return NextResponse.json({ error: 'Erreur OCR interne' }, { status: 500 })
  }
}

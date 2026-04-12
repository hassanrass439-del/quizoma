import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const base64 = arrayBufferToBase64(await file.arrayBuffer())

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
      return NextResponse.json({ error: 'Erreur OCR' }, { status: 500 })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Erreur OCR' }, { status: 500 })
  }
}

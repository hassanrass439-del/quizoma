import { geminiRetryFetch } from './geminiRetry'

/**
 * Utilise Gemini Vision pour extraire le texte d'un PDF scanné (image).
 * Envoie le PDF en base64 et demande l'extraction complète du texte.
 */
export async function ocrPDF(pdfBuffer: Buffer): Promise<string> {
  const base64 = pdfBuffer.toString('base64')

  const res = await geminiRetryFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64,
                },
              },
              {
                text: `Extrais tout le texte de ce document PDF de manière fidèle et complète.
Conserve exactement la structure : numérotation des questions, propositions A/B/C/D/E, cas cliniques, tableaux.
Ne résume rien, ne reformule rien, ne commente rien.
Renvoie UNIQUEMENT le texte brut extrait, ligne par ligne.`,
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[OCR] Gemini error:', res.status, err.slice(0, 200))
    throw new Error(`OCR error ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

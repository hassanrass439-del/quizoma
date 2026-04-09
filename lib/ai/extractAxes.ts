import { SYSTEM_PROMPT_AXES } from './prompts'
import { geminiRetryFetch } from './geminiRetry'

interface Axe {
  id: number
  titre: string
}

/**
 * Utilise Gemini pour extraire les axes principaux d'un cours.
 * Retourne une liste de titres tels qu'ils apparaissent dans le texte.
 */
export async function extractAxes(text: string): Promise<Axe[]> {
  // Limiter le texte envoyé (les 8000 premiers chars suffisent pour détecter la structure)
  const truncated = text.slice(0, 8000)

  const res = await geminiRetryFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    console.error('[extractAxes] Gemini error:', res.status)
    return []
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(raw) as { axes_principaux: Axe[] }
    return parsed.axes_principaux ?? []
  } catch {
    console.error('[extractAxes] Invalid JSON:', raw.slice(0, 200))
    return []
  }
}

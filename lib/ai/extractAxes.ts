import { SYSTEM_PROMPT_AXES } from './prompts'

export interface Axe {
  id: number
  titre: string
  debut_exact: string
}

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]

/**
 * Utilise Gemini pour extraire les axes principaux d'un cours.
 * Retourne les titres + les 10 premiers mots de chaque axe (empreinte).
 */
export async function extractAxes(text: string): Promise<Axe[]> {
  // Envoyer assez de texte pour que l'IA voie toute la structure
  const truncated = text.slice(0, 12000)
  const apiKey = process.env.GEMINI_API_KEY

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

      if (res.status === 503 || res.status === 429) {
        console.log(`[extractAxes] ${model} → ${res.status}, trying next...`)
        continue
      }

      if (!res.ok) continue

      const data = await res.json()
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      const parsed = JSON.parse(raw) as { axes_principaux: Axe[] }
      console.log(`[extractAxes] ${model} → ${parsed.axes_principaux?.length ?? 0} axes`)
      return parsed.axes_principaux ?? []
    } catch {
      continue
    }
  }

  console.error('[extractAxes] All models failed')
  return []
}

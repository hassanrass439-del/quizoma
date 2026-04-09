import { SYSTEM_PROMPT_MODE2 } from './prompts'
import { geminiRetryFetch } from './geminiRetry'

export interface SolvedQCM {
  vraie_combinaison: string
  explications: string
}

/**
 * Envoie UN bloc QCM à Gemini et retourne la combinaison correcte + les explications.
 */
export async function solveQCMQuestion(questionText: string): Promise<SolvedQCM> {
  const res = await geminiRetryFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT_MODE2 }] },
        contents: [{ role: 'user', parts: [{ text: questionText }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text) as SolvedQCM
    // Normalise la combinaison : trie les lettres alphabétiquement et met en majuscules
    parsed.vraie_combinaison = parsed.vraie_combinaison
      .toUpperCase()
      .replace(/[^A-E]/g, '')
      .split('')
      .sort()
      .join('')
    return parsed
  } catch {
    throw new Error(`Réponse IA invalide : ${text.slice(0, 200)}`)
  }
}

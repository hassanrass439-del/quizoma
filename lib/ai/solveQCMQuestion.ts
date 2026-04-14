import { SYSTEM_PROMPT_MODE2 } from './prompts'

export interface SolvedQCM {
  vraie_combinaison: string
  explications: string
}

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]

export async function solveQCMQuestion(questionText: string): Promise<SolvedQCM> {
  const apiKey = process.env.GEMINI_API_KEY

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

      if (res.status === 503 || res.status === 429) {
        console.log(`[solveQCM] ${model} → ${res.status}, trying next...`)
        continue
      }

      if (!res.ok) {
        const err = await res.text()
        console.error(`[solveQCM] ${model} error:`, res.status, err.slice(0, 100))
        continue
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      const parsed = JSON.parse(text) as SolvedQCM
      parsed.vraie_combinaison = parsed.vraie_combinaison
        .toUpperCase()
        .replace(/[^A-E]/g, '')
        .split('')
        .sort()
        .join('')

      console.log(`[solveQCM] ${model} → OK:`, parsed.vraie_combinaison)
      return parsed
    } catch (err) {
      console.error(`[solveQCM] ${model} failed:`, err)
      continue
    }
  }

  throw new Error('Tous les modèles Gemini sont indisponibles')
}

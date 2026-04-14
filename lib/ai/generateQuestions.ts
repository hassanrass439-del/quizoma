import { SYSTEM_PROMPT_MODE1 } from './prompts'
import type { GeneratedQuestionsResponse } from '@/types/ai.types'

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
]

export async function generateQuestions(chunk: string, count = 3): Promise<GeneratedQuestionsResponse> {
  const prompt = SYSTEM_PROMPT_MODE1.replace('exactement 3 questions', `exactement ${count} questions`)
  const apiKey = process.env.GEMINI_API_KEY

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

      if (res.status === 503 || res.status === 429) {
        console.log(`[generateQ] ${model} → ${res.status}, trying next...`)
        continue
      }

      if (!res.ok) continue

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      return JSON.parse(text) as GeneratedQuestionsResponse
    } catch {
      continue
    }
  }

  throw new Error('Tous les modèles Gemini sont indisponibles')
}

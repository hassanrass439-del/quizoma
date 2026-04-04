import { SYSTEM_PROMPT_MODE2 } from './prompts'
import type { ParseQCMResponse } from '@/types/ai.types'

export async function parseQCM(qcmText: string): Promise<ParseQCMResponse> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT_MODE2 }] },
        contents: [{ role: 'user', parts: [{ text: qcmText }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
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
    return JSON.parse(text) as ParseQCMResponse
  } catch {
    throw new Error(`Réponse IA invalide : ${text.slice(0, 200)}`)
  }
}

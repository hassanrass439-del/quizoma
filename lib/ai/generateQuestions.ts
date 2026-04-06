import { SYSTEM_PROMPT_MODE1 } from './prompts'
import { geminiRetryFetch } from './geminiRetry'
import type { GeneratedQuestionsResponse } from '@/types/ai.types'

export async function generateQuestions(chunk: string, count = 3): Promise<GeneratedQuestionsResponse> {
  const prompt = SYSTEM_PROMPT_MODE1.replace('exactement 3 questions', `exactement ${count} questions`)
  const payload = {
    systemInstruction: { parts: [{ text: prompt }] },
    contents: [{ role: 'user', parts: [{ text: chunk }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
  }

  const res = await geminiRetryFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 500)}`)
  }

  const data = await res.json()
  console.log('[Gemini] Response keys:', Object.keys(data))
  console.log('[Gemini] Candidates count:', data.candidates?.length)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  console.log('[Gemini] Raw text (first 300 chars):', text.slice(0, 300))

  try {
    return JSON.parse(text) as GeneratedQuestionsResponse
  } catch {
    throw new Error(`Réponse IA invalide : ${text.slice(0, 200)}`)
  }
}

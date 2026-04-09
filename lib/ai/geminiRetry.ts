/**
 * Wrapper fetch pour Gemini avec retry + backoff exponentiel sur 429/503.
 */
export async function geminiRetryFetch(
  url: string,
  init: RequestInit,
  maxRetries = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init)

    if (res.ok) return res

    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      const delay = 1000 + Math.random() * 500
      console.log(`[Gemini] ${res.status} — retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`)
      await new Promise((r) => setTimeout(r, delay))
      continue
    }

    return res
  }

  return fetch(url, init)
}

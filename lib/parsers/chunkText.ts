import type { ChunkOptions, Chapter } from '@/types/ai.types'

/**
 * Découpe le texte en chunks de ~500 mots avec overlap de 50 mots.
 */
export function chunkText(
  text: string,
  { size = 500, overlap = 50 }: ChunkOptions = { size: 500, overlap: 50 }
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  let i = 0

  while (i < words.length) {
    const chunk = words.slice(i, i + size).join(' ')
    chunks.push(chunk)
    i += size - overlap
  }

  return chunks
}

/**
 * Extrait la table des matières en détectant les titres numérotés.
 */
export function extractChapters(text: string): Chapter[] {
  const lines = text.split('\n')
  const chapters: Chapter[] = []

  // Patterns : "I.", "II.", "1.", "A.", "Chapitre 1", "CHAPITRE I"
  const titleRegex =
    /^((?:[IVX]+\.|[A-Z]\.|[0-9]+\.|Chapitre\s+[IVX0-9]+|CHAPITRE\s+[IVX0-9]+)\s+.{3,60})$/i

  let charIndex = 0
  for (const line of lines) {
    if (titleRegex.test(line.trim())) {
      chapters.push({
        title: line.trim(),
        startIndex: charIndex,
        endIndex: charIndex + line.length,
      })
    }
    charIndex += line.length + 1 // +1 for '\n'
  }

  // Mettre à jour endIndex pour chaque chapitre
  for (let i = 0; i < chapters.length - 1; i++) {
    chapters[i].endIndex = chapters[i + 1].startIndex - 1
  }
  if (chapters.length > 0) {
    chapters[chapters.length - 1].endIndex = text.length
  }

  return chapters
}

/**
 * Nettoie un texte extrait (supprime les sauts de ligne excessifs).
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

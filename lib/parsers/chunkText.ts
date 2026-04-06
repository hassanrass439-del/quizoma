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
 * Extrait les axes / chapitres en détectant les titres numérotés
 * et les termes courants dans les cours médicaux.
 */
export function extractChapters(text: string): Chapter[] {
  const lines = text.split('\n')
  const chapters: Chapter[] = []

  // Patterns : "I.", "II.", "1.", "A.", "Chapitre 1", "CHAPITRE I"
  // + axes médicaux courants en début de ligne (Introduction, Définition, Épidémiologie, etc.)
  const medicalAxes = 'Introduction|Définition|D[eé]finitions|[EÉ]pid[eé]miologie|Physiopathologie|Anatomie|Histologie|Diagnostic|Clinique|Examen\\s+[Cc]linique|Examens?\\s+[Cc]ompl[eé]mentaires|Paraclinique|Traitement|Th[eé]rapeutique|Prise\\s+en\\s+charge|[EÉ]tiologie|[EÉ]tiologies|Classification|Complications?|Pronostic|Pr[eé]vention|Conclusion|Signes?\\s+[Cc]liniques?|Signes?\\s+[Ff]onctionnels?|Bilan|Facteurs?\\s+de\\s+risque|Formes?\\s+[Cc]liniques?'
  const titleRegex = new RegExp(
    `^((?:[IVX]+\\.|[A-Z]\\.|[0-9]+\\.|Chapitre\\s+[IVX0-9]+|CHAPITRE\\s+[IVX0-9]+)\\s+.{3,80}|(?:${medicalAxes})(?:\\s*[:–\\-—]\\s*.{0,80})?)$`,
    'i'
  )

  const seen = new Set<string>()
  let charIndex = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (titleRegex.test(trimmed)) {
      // Dédupliquer par titre normalisé (minuscules, sans ponctuation)
      const key = trimmed.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, '').replace(/\s+/g, ' ').trim()
      if (!seen.has(key)) {
        seen.add(key)
        chapters.push({
          title: trimmed,
          startIndex: charIndex,
          endIndex: charIndex + line.length,
        })
      }
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

/**
 * Découpe un texte brut d'annales QCM en blocs individuels.
 * Chaque bloc = 1 question + ses propositions A–E.
 */
export function parseQCMBlocks(text: string): string[] {
  // Normalise les fins de ligne
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split sur les marqueurs de questions courants dans les annales médicales :
  // "Question 1", "Question N°1", "Q1", ou un numéro seul en début de ligne "1." / "1)"
  // On exclut les unités médicales pour éviter les faux positifs (mg, ml, kg, etc.)
  const medicalUnits = 'mg|ml|g|kg|mcg|ui|meq|cm|mm|m|s|min|h|j|ans|mois|semaines?|bpm|mmhg|g\\/dl|mmol|µmol|pg|ng|µg|ml\\/min|l\\/min|%|°c|kg\\/m2'
  const questionMarker = new RegExp(
    `(?:^|\\n)\\s*(?=(?:Question\\s*N?°?\\s*\\d+|Q\\s*\\d+))|` +
    `(?:^|\\n)\\s*(?=\\d+[.)][^\\S\\n]*(?!(?:${medicalUnits})\\b))`,
    'gi'
  )

  const blocks = normalized.split(questionMarker)

  const cleaned = blocks
    .map((block) => {
      let b = block.trim()
      if (!b) return null

      // Retire le préfixe numérique ou "Question N°X"
      b = b.replace(/^(?:Question\s*N?°?\s*\d+\s*[:\s-]*|Q\s*\d+\s*[:\s-]*|\d+[.)]\s*)/i, '').trim()

      // Met chaque proposition (A. B. C. D. E.) sur sa propre ligne
      b = b.replace(/([^\n])(\s+)([A-E][.)]\s)/g, '$1\n$3')

      return b
    })
    .filter((b): b is string => {
      if (!b || b.length < 15) return false
      // Doit contenir au moins une proposition A–E
      return /[A-E][.)]\s/i.test(b)
    })

  return cleaned
}

/**
 * Découpe un texte brut d'annales QCM en blocs individuels.
 * Chaque bloc = énoncé du cas clinique (si présent) + question + propositions A–E.
 */
export function parseQCMBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Identifier les questions numérotées (1., 2., Question N°1, etc.)
  // Exclure les unités médicales
  const medicalUnits = 'mg|ml|g|kg|mcg|ui|meq|cm|mm|m|s|min|h|j|ans|mois|semaines?|bpm|mmhg|g\\/dl|mmol|µmol|pg|ng|µg|ml\\/min|l\\/min|%|°c|kg\\/m2'
  const questionRegex = new RegExp(
    `(?:^|\\n)\\s*(?:Question\\s*N?°?\\s*\\d+|Q\\s*\\d+|\\d+[.)][^\\S\\n]*(?!(?:${medicalUnits})\\b))`,
    'gi'
  )

  // Trouver toutes les positions de questions
  const matches: { index: number; match: string }[] = []
  let m
  while ((m = questionRegex.exec(normalized)) !== null) {
    matches.push({ index: m.index, match: m[0] })
  }

  if (matches.length === 0) return []

  // Extraire les blocs bruts entre chaque question
  const rawBlocks: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i < matches.length - 1 ? matches[i + 1].index : normalized.length
    rawBlocks.push(normalized.slice(start, end).trim())
  }

  // Séparer les blocs qui sont des cas cliniques (pas de propositions A-E)
  // et les fusionner avec la question suivante
  const finalBlocks: string[] = []
  let pendingContext = '' // Énoncé de cas clinique en attente

  for (const raw of rawBlocks) {
    // Nettoyer le préfixe numérique
    let cleaned = raw.replace(/^(?:Question\s*N?°?\s*\d+\s*[:\s-]*|Q\s*\d+\s*[:\s-]*|\d+[.)]\s*)/i, '').trim()

    // Mettre chaque proposition sur sa propre ligne
    cleaned = cleaned.replace(/([^\n])(\s+)([A-E][.)]\s)/g, '$1\n$3')

    const hasPropositions = /[A-E][.)]\s/i.test(cleaned)
    const isLongEnough = cleaned.length > 15

    if (!isLongEnough) {
      continue
    }

    if (!hasPropositions) {
      // C'est un énoncé de cas clinique sans propositions → garder pour la prochaine question
      pendingContext = (pendingContext ? pendingContext + '\n\n' : '') + cleaned
    } else {
      // C'est une vraie question avec propositions
      // Fusionner avec le cas clinique en attente
      const fullQuestion = pendingContext
        ? pendingContext + '\n\n' + cleaned
        : cleaned
      finalBlocks.push(fullQuestion)
      pendingContext = '' // Reset le contexte
    }
  }

  return finalBlocks
}

import type { AntiCheatData } from '@/types/game.types'

function normalizeMode1(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Supprimer accents
    .replace(/[^\w\s]/g, '')           // Supprimer ponctuation
    .trim()
}

function normalizeMode2(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-E]/g, '')            // Garder uniquement A–E
    .split('')
    .sort()
    .join('')                           // Trier alphabétiquement
}

export function isCorrectAnswer(
  input: string,
  mode: 1 | 2,
  data: AntiCheatData
): boolean {
  const normalize = mode === 1 ? normalizeMode1 : normalizeMode2
  const normalized = normalize(input)
  if (!normalized) return false
  const validAnswers = [data.vraie_reponse, ...data.synonymes].map(normalize)
  return validAnswers.includes(normalized)
}

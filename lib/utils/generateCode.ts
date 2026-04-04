/**
 * Génère un code de partie à 6 chiffres sécurisé.
 */
export function generateGameCode(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(array[0] % 1000000).padStart(6, '0')
}

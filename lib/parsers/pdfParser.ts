// Serveur uniquement — utiliser dans Route Handlers uniquement

export async function parsePDF(buffer: Buffer): Promise<string> {
  // pdf-parse doit être importé dynamiquement (module CommonJS)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse')
  const data = await pdfParse(buffer)
  return data.text
}

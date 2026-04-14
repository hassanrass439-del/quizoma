import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePDF } from '@/lib/parsers/pdfParser'
import { parseDOCX } from '@/lib/parsers/docxParser'
import { cleanText } from '@/lib/parsers/chunkText'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) ?? 'bluff'

    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    // Pas de limite — les gros fichiers passent en OCR côté client

    const buffer = Buffer.from(await file.arrayBuffer())
    let rawText = ''
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    if (isPDF) {
      rawText = await parsePDF(buffer)
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      rawText = await parseDOCX(buffer)
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      rawText = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Format non supporté' }, { status: 415 })
    }

    const cleanedText = cleanText(rawText)
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

    // Si PDF scan (peu de texte), signaler au client qu'il faut OCR
    const needsOCR = isPDF && wordCount < 20

    // Extraction des thèmes QCM (regex, pas d'IA)
    let chapters: Array<{ title: string; startIndex: number; endIndex: number }> = []
    if (!needsOCR && mode === 'annales') {
      const themeRegex = /^(\d+)\.\s+([A-ZÀ-ÿ][A-ZÀ-ÿ\s\-'']+)$/gm
      let match
      const themes: Array<{ title: string; startIndex: number }> = []
      while ((match = themeRegex.exec(cleanedText)) !== null) {
        const title = `${match[1]}. ${match[2].trim()}`
        if (!themes.some((t) => t.title === title)) {
          themes.push({ title, startIndex: match.index })
        }
      }
      chapters = themes.map((t, i) => ({
        title: t.title,
        startIndex: t.startIndex,
        endIndex: i < themes.length - 1 ? themes[i + 1].startIndex : cleanedText.length,
      }))
    }

    return NextResponse.json({
      text: cleanedText,
      chapters,
      wordCount,
      needsOCR,
      // Passer le mode pour que le client sache s'il doit appeler extractAxes
      needsAxes: !needsOCR && mode === 'bluff' && wordCount >= 20,
    })
  } catch (err) {
    console.error('Error parsing document:', err)
    return NextResponse.json({ error: 'Erreur lors de l\'extraction' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePDF } from '@/lib/parsers/pdfParser'
import { parseDOCX } from '@/lib/parsers/docxParser'
import { cleanText } from '@/lib/parsers/chunkText'
import { extractAxes } from '@/lib/ai/extractAxes'
import { ocrPDF } from '@/lib/ai/ocrPDF'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) ?? 'bluff'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10 Mo
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 413 })
    }

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
      return NextResponse.json({ error: 'Format non supporté (PDF, DOCX, TXT uniquement)' }, { status: 415 })
    }

    // Fallback OCR : si le PDF a peu de texte (scan/image), utiliser Gemini Vision
    if (isPDF && rawText.split(/\s+/).filter(Boolean).length < 20) {
      console.log('[parse-document] Texte insuffisant, fallback OCR Gemini...')
      try {
        rawText = await ocrPDF(buffer)
        console.log('[parse-document] OCR OK, mots extraits:', rawText.split(/\s+/).length)
      } catch (err) {
        console.error('[parse-document] OCR error:', err)
      }
    }

    const cleanedText = cleanText(rawText)
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

    let chapters: Array<{ title: string; startIndex: number; endIndex: number }> = []

    if (mode === 'bluff') {
      // Mode cours : extraction des axes via IA
      const axes = await extractAxes(cleanedText)
      chapters = axes.map((axe) => {
        const searchKey = axe.titre.replace(/^[IVX]+\.\s*/i, '').slice(0, 30).toLowerCase()
        const idx = cleanedText.toLowerCase().indexOf(searchKey)
        return {
          title: axe.titre,
          startIndex: idx >= 0 ? idx : 0,
          endIndex: cleanedText.length,
        }
      })
      for (let i = 0; i < chapters.length - 1; i++) {
        chapters[i].endIndex = chapters[i + 1].startIndex > 0 ? chapters[i + 1].startIndex : chapters[i].endIndex
      }
    } else {
      // Mode QCM/annales : extraction des grands thèmes numérotés (ex: "1. BRÛLURES GRAVES")
      const themeRegex = /^(\d+)\.\s+([A-ZÀ-ÿ][A-ZÀ-ÿ\s\-'']+)$/gm
      let match
      const themes: Array<{ title: string; startIndex: number }> = []
      while ((match = themeRegex.exec(cleanedText)) !== null) {
        const title = `${match[1]}. ${match[2].trim()}`
        // Dédupliquer
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
    })
  } catch (err) {
    console.error('Error parsing document:', err)
    return NextResponse.json({ error: 'Erreur lors de l\'extraction' }, { status: 500 })
  }
}

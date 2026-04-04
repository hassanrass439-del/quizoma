import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePDF } from '@/lib/parsers/pdfParser'
import { parseDOCX } from '@/lib/parsers/docxParser'
import { cleanText, extractChapters } from '@/lib/parsers/chunkText'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10 Mo
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let rawText = ''

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
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

    const cleanedText = cleanText(rawText)
    const chapters = extractChapters(cleanedText)
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length

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

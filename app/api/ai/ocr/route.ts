import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ocrPDF } from '@/lib/ai/ocrPDF'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await ocrPDF(buffer)

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[OCR route] error:', err)
    return NextResponse.json({ error: 'Erreur OCR' }, { status: 500 })
  }
}

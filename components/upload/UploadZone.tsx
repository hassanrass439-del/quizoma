'use client'

import { useRef, useState } from 'react'
import { FileText, AlignLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onFileSelect: (file: File) => void
  onTextPaste: (text: string) => void
  isProcessing: boolean
  wordCount: number
}

export function UploadZone({ onFileSelect, onTextPaste, isProcessing, wordCount }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTextArea, setShowTextArea] = useState(false)
  const [pastedText, setPastedText] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024 // 10 Mo
    if (file.size > maxSize) {
      alert('Fichier trop volumineux (max 10 Mo)')
      return
    }
    onFileSelect(file)
    // Reset input pour pouvoir sélectionner le même fichier à nouveau
    e.target.value = ''
  }

  function handleTextSubmit() {
    if (pastedText.trim().length < 100) return
    onTextPaste(pastedText.trim())
    setShowTextArea(false)
  }

  const words = pastedText.trim().split(/\s+/).filter(Boolean).length

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-surface-2 border border-game-border rounded-card p-8">
        <Loader2 size={32} className="text-primary animate-spin" />
        <p className="text-text font-semibold">Extraction en cours…</p>
        <p className="text-muted-game text-sm text-center">
          Analyse du document et détection des chapitres
        </p>
      </div>
    )
  }

  if (showTextArea) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Colle ton cours ici (minimum 100 mots)…"
            className="w-full min-h-[200px] bg-surface-3 border border-game-border rounded-xl p-4 text-text placeholder:text-muted-game resize-none focus:outline-none focus:border-primary text-sm"
            autoFocus
          />
          <span className={`absolute bottom-3 right-3 text-xs ${words < 100 ? 'text-danger' : 'text-success'}`}>
            {words} mots
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTextArea(false)}
            className="flex-1 border-game-border text-muted-game hover:bg-surface-3"
          >
            Annuler
          </Button>
          <Button
            onClick={handleTextSubmit}
            disabled={words < 100}
            className="flex-1 bg-primary hover:bg-primary-dark font-bold"
          >
            Utiliser ce texte
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        hidden
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold justify-start gap-3"
      >
        <FileText size={20} className="text-primary" />
        Importer un fichier
        <span className="text-muted-game text-xs ml-auto">PDF · DOCX · TXT</span>
      </Button>

      <Button
        onClick={() => setShowTextArea(true)}
        variant="outline"
        className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold justify-start gap-3"
      >
        <AlignLeft size={20} className="text-primary" />
        Coller du texte
      </Button>

      {wordCount > 0 && (
        <p className="text-success text-sm text-center">
          ✓ {wordCount} mots extraits
        </p>
      )}
    </div>
  )
}

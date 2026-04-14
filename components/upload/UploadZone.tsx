'use client'

import { useRef, useState } from 'react'
import { Loader2, CloudUpload, Info, FileText, Upload, ClipboardPaste } from 'lucide-react'
import { AILoader } from '@/components/ui/AILoader'
import { useGoogleDrivePicker } from '@/hooks/useGoogleDrivePicker'

interface Props {
  onFileSelect: (file: File) => void
  onTextPaste: (text: string) => void
  isProcessing: boolean
  processingStep?: string
  wordCount: number
}

export function UploadZone({ onFileSelect, onTextPaste, isProcessing, processingStep, wordCount }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showTextArea, setShowTextArea] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const { openPicker } = useGoogleDrivePicker(onFileSelect)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Pas de limite stricte — les gros fichiers passent en OCR direct
    onFileSelect(file)
    e.target.value = ''
  }

  function handleTextSubmit() {
    if (pastedText.trim().length < 10) return
    onTextPaste(pastedText.trim())
    setShowTextArea(false)
  }

  const words = pastedText.trim().split(/\s+/).filter(Boolean).length

  if (isProcessing) {
    return (
      <div className="bg-surface-2 border border-[#484456]/30 rounded-[18px] p-6">
        <AILoader
          text="Extraction en cours..."
          subtext={processingStep || 'Analyse du document...'}
          size={140}
        />
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
            placeholder="Colle ton cours ici (minimum 5 mots)…"
            className="w-full min-h-[200px] bg-[#0d0d1a] border border-[#484456] rounded-xl p-4 text-text placeholder:text-text-muted resize-none focus:outline-none focus:border-[#6c3ff5] text-sm"
            autoFocus
          />
          <span className={`absolute bottom-3 right-3 text-xs font-bold ${words < 5 ? 'text-danger' : 'text-[#45dfa4]'}`}>
            {words} mots
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTextArea(false)}
            className="flex-1 h-12 rounded-xl border border-[#484456] text-text-muted hover:bg-surface-3 transition-colors font-semibold"
          >
            Annuler
          </button>
          <button
            onClick={handleTextSubmit}
            disabled={words < 5}
            className="flex-1 h-12 rounded-xl bg-[#6c3ff5] text-[#e9e1ff] font-headline font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Utiliser ce texte
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} hidden />

      {/* Option A — PDF/Word (Recommended) */}
      <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className="absolute -top-2.5 right-4 z-10 bg-[#6c3ff5] text-[#e9e1ff] text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wider shadow-lg">
          RECOMMANDÉ
        </div>
        <div className="flex items-center gap-4 bg-surface-2 h-[92px] px-4 rounded-xl border border-[#6c3ff5]/20 hover:border-[#6c3ff5]/60 transition-colors">
          <div className="w-12 h-12 flex-shrink-0 bg-[#6c3ff5]/20 rounded-full flex items-center justify-center">
            <FileText size={24} className="text-[#cbbeff]" />
          </div>
          <div className="flex-grow">
            <h3 className="font-bold text-text text-base">Fichier PDF ou Word</h3>
            <p className="text-text-muted text-xs">.pdf .docx .txt</p>
          </div>
          <Upload size={20} className="text-[#cbbeff]" />
        </div>
      </div>

      {/* Option B — Google Drive */}
      <div
        className="flex items-center gap-4 bg-surface-2 h-[76px] px-4 rounded-xl border border-[#484456]/20 hover:bg-surface-3 transition-colors cursor-pointer relative"
        onClick={openPicker}
      >
        <div className="w-10 h-10 flex-shrink-0 bg-surface-3 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 87.3 78" width={20} height={20} aria-hidden>
            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
            <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#ea4335"/>
            <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
            <path d="M59.8 53H87.3L73.55 29.5 57.4 0H43.65L59.8 53z" fill="#2684fc"/>
            <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#ffba00"/>
          </svg>
        </div>
        <div className="flex-grow">
          <h3 className="font-bold text-text text-base">Google Drive</h3>
          <p className="text-text-muted text-xs">PDF · DOCX · Google Docs</p>
        </div>
      </div>

      {/* Option C — Paste text */}
      <div
        className="flex items-center gap-4 bg-surface-2 h-[76px] px-4 rounded-xl border border-[#484456]/20 hover:bg-surface-3 transition-colors cursor-pointer"
        onClick={() => setShowTextArea(true)}
      >
        <div className="w-10 h-10 flex-shrink-0 bg-surface-3 rounded-full flex items-center justify-center">
          <ClipboardPaste size={20} className="text-text-muted" />
        </div>
        <div className="flex-grow">
          <h3 className="font-bold text-text text-base">Coller du texte</h3>
          <p className="text-text-muted text-xs">Copie-colle ton contenu de cours</p>
        </div>
      </div>

      {/* Drop zone */}
      <div className="w-full h-[100px] rounded-xl flex flex-col items-center justify-center bg-[#6c3ff5]/5 gap-2 transition-all hover:bg-[#6c3ff5]/10 border-2 border-dashed border-[#6c3ff5]/40 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUpload size={28} className="text-[#cbbeff]/60" />
        <p className="text-text-muted text-sm font-medium">Dépose un fichier ici</p>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#0d0d1a] rounded-xl border border-[#484456]/20">
        <Info size={18} className="text-text-muted flex-shrink-0 mt-0.5" />
        <p className="text-text-muted text-[13px] leading-snug">Importe ton fichier ou colle ton texte pour commencer.</p>
      </div>

      {wordCount > 0 && (
        <p className="text-[#45dfa4] text-sm text-center font-semibold">✓ {wordCount} mots extraits</p>
      )}
    </div>
  )
}

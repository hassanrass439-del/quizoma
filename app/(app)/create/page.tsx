'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { UploadZone } from '@/components/upload/UploadZone'
import { ChapterSelector } from '@/components/upload/ChapterSelector'
import { AILoader } from '@/components/ui/AILoader'
import { ArrowLeft, ArrowRight, ChevronRight, Check, FolderOpen, Sparkles, Drama, FileQuestion } from 'lucide-react'
import type { Chapter } from '@/types/ai.types'
import type { GameMode } from '@/types/game.types'

const NB_QUESTIONS_OPTIONS = [4, 10, 15, 20]

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  )
}

function CreatePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reuseCode = searchParams.get('reuse')
  const [source, setSource] = useState<'choose' | 'new'>('choose')
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [mode, setMode] = useState<GameMode>('bluff')
  const [rawText, setRawText] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [nbQuestions, setNbQuestions] = useState(10)
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [isCreating, setIsCreating] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [reuseLoading, setReuseLoading] = useState(!!reuseCode)

  // Charger le texte source depuis la partie précédente
  useEffect(() => {
    if (!reuseCode) return
    async function loadSource() {
      try {
        const res = await fetch(`/api/game/${reuseCode}/source`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setMode(data.mode as GameMode)
        setRawText(data.text)
        setWordCount(data.text.split(/\s+/).filter(Boolean).length)
        if (data.chapters && data.chapters.length > 0) {
          setChapters(data.chapters)
          setSelectedChapters([data.chapters[0].title])
          setSource('new')
          setStep(3)
        } else {
          setSource('new')
          setStep(4)
        }
      } catch {
        toast.error('Impossible de charger le cours précédent')
        setSource('choose')
      } finally {
        setReuseLoading(false)
      }
    }
    loadSource()
  }, [reuseCode])

  const [processingStep, setProcessingStep] = useState('')
  const fileRef = useRef<File | null>(null)

  async function handleFileSelect(file: File) {
    setIsProcessing(true)
    fileRef.current = file
    try {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 10 Mo)')
        return
      }

      let text = ''
      let wc = 0
      let needsOCR = false
      let needsAxes = false
      let chapters: Array<{ title: string; startIndex: number; endIndex: number }> = []

      // Si fichier > 4MB (limite Vercel body), aller directement en OCR
      if (file.size > 4 * 1024 * 1024) {
        needsOCR = true
      } else {
        // Étape 1 : extraction texte (rapide, pas d'IA)
        setProcessingStep('Extraction du texte...')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('mode', mode)
        const res = await fetch('/api/ai/parse-document', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Erreur extraction')
        const data = await res.json()

        text = data.text as string
        wc = data.wordCount as number
        needsOCR = data.needsOCR ?? false
        needsAxes = data.needsAxes ?? false
        chapters = data.chapters ?? []
      }

      // Étape 2 : OCR si nécessaire (appel IA dédié, retry côté client)
      if (needsOCR) {
        setProcessingStep('Scan détecté, lecture par IA...')

        // Vérifier la taille (Vercel Edge body limit)
        if (file.size > 8 * 1024 * 1024) {
          toast.error('Le PDF est trop volumineux (max 8 Mo). Essaie de coller le texte manuellement.')
          return
        }

        const ocrForm = new FormData()
        ocrForm.append('file', file)

        let ocrSuccess = false
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const ocrRes = await fetch('/api/ai/ocr', { method: 'POST', body: ocrForm })
            if (ocrRes.ok) {
              const ocrData = await ocrRes.json()
              text = ocrData.text
              wc = text.split(/\s+/).filter(Boolean).length
              ocrSuccess = true
              break
            }
            if (attempt < 2) {
              setProcessingStep(`Nouvel essai (${attempt + 2}/3)...`)
              await new Promise((r) => setTimeout(r, 2000))
            }
          } catch {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 2000))
            }
          }
        }

        if (!ocrSuccess) {
          toast.error('Impossible de lire ce PDF scanné. Colle le texte manuellement.')
          return
        }
      }

      if (wc < 5) {
        toast.error('Impossible d\'extraire le texte. Essaie de coller le texte manuellement.')
        return
      }

      setRawText(text)
      setWordCount(wc)

      // Étape 3 : extraction axes si mode bluff (appel IA dédié)
      if (needsAxes || (needsOCR && mode === 'bluff')) {
        setProcessingStep('Détection des axes du cours...')
        try {
          const axesRes = await fetch('/api/ai/axes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          })
          if (axesRes.ok) {
            const axesData = await axesRes.json()
            setChapters(axesData.chapters)
            setSelectedChapters(axesData.chapters.length > 0 ? [axesData.chapters[0].title] : [])
            setStep(axesData.chapters.length > 0 ? 3 : 4)
            return
          }
        } catch { /* fallback: pas d'axes */ }
      }

      // Mode QCM ou pas d'axes : utiliser les chapters du parse initial
      if (chapters.length > 0 && !needsOCR) {
        setChapters(chapters)
        setSelectedChapters([chapters[0].title])
        setStep(3)
      } else {
        // Mode QCM après OCR : re-détecter les thèmes dans le texte OCR
        if (mode === 'annales') {
          const themeRegex = /^(\d+)\.\s+([A-ZÀ-ÿ][A-ZÀ-ÿ\s\-'']+)$/gm
          let match
          const themes: Array<{ title: string; startIndex: number; endIndex: number }> = []
          while ((match = themeRegex.exec(text)) !== null) {
            const title = `${match[1]}. ${match[2].trim()}`
            if (!themes.some((t) => t.title === title)) {
              themes.push({ title, startIndex: match.index, endIndex: text.length })
            }
          }
          for (let i = 0; i < themes.length - 1; i++) {
            themes[i].endIndex = themes[i + 1].startIndex
          }
          if (themes.length > 0) {
            setChapters(themes)
            setSelectedChapters([themes[0].title])
            setStep(3)
            return
          }
        }
        setChapters([])
        setSelectedChapters([])
        setStep(4)
      }
    } catch {
      toast.error('Erreur lors de l\'extraction du document')
    } finally {
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  function handleTextPaste(text: string) {
    setRawText(text)
    setChapters([])
    setSelectedChapters([])
    setWordCount(text.split(/\s+/).filter(Boolean).length)
    setStep(4)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      let selectedText = rawText
      if (selectedChapters.length > 0 && chapters.length > 0) {
        const selected = chapters.filter((c) => selectedChapters.includes(c.title))
        selectedText = selected.map((c) => rawText.slice(c.startIndex, c.endIndex)).join('\n\n')
      }
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          text: selectedText,
          fullText: rawText,
          chapters: chapters.length > 0 ? chapters : undefined,
          config: { nb_questions: nbQuestions, timer_seconds: timerSeconds },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Mode bluff cache miss : générer les questions via Edge (pas de timeout)
      if (data.needsGeneration && data.chunks) {
        setProcessingStep('L\'IA génère vos questions...')
        const allQuestions: Array<{ question: string; vraie_reponse: string; synonymes: string[]; explication: string }> = []
        const seenAnswers = new Set<string>()

        for (let i = 0; i < data.chunks.length; i++) {
          if (allQuestions.length >= data.nbQuestions) break
          try {
            const chunkRes = await fetch('/api/ai/generate-chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chunk: data.chunks[i], count: data.nbQuestions - allQuestions.length }),
            })
            if (chunkRes.ok) {
              const chunkData = await chunkRes.json()
              for (const q of chunkData.questions ?? []) {
                if (!seenAnswers.has(q.vraie_reponse?.toLowerCase())) {
                  seenAnswers.add(q.vraie_reponse?.toLowerCase())
                  allQuestions.push(q)
                }
              }
            }
          } catch { /* continue with next chunk */ }
        }

        // Envoyer les questions au serveur
        if (allQuestions.length > 0) {
          await fetch(`/api/game/${data.code}/add-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: allQuestions.slice(0, data.nbQuestions) }),
          })
        }
        setProcessingStep('')
      }

      router.push(`/lobby/${data.code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
      setIsCreating(false)
      setProcessingStep('')
    }
  }

  if (reuseLoading) {
    return (
      <div className="min-h-full bg-[#12121f] flex items-center justify-center">
        <AILoader text="Chargement du cours..." subtext="Récupération des données" />
      </div>
    )
  }

  if (source === 'choose') {
    return (
      <div className="min-h-full bg-[#12121f] pb-32">
        <header className="sticky top-0 z-50 bg-[#12121f]/80 backdrop-blur-xl flex items-center px-6 py-5">
          <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center text-text">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-headline font-extrabold text-lg tracking-tight text-text uppercase flex-1 text-center">Nouvelle partie</h1>
          <div className="w-10" />
        </header>

        <div className="px-6 py-6 space-y-4">
          <div>
            <h2 className="text-xl font-black text-text font-headline">Créer une partie</h2>
            <p className="text-text-muted text-sm mt-1">Choisis ton point de départ</p>
          </div>

          <Link href="/library">
            <button className="w-full flex items-center gap-4 bg-surface-2 border border-[#484456]/40 hover:border-[#6c3ff5]/50 hover:bg-surface-3 rounded-[18px] p-5 text-left transition-all active:scale-[0.98]">
              <FolderOpen size={28} className="text-[#cbbeff] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-text font-bold font-headline">Depuis ma bibliothèque</p>
                <p className="text-text-muted text-sm mt-0.5">Utiliser un quiz déjà créé — instantané</p>
              </div>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
          </Link>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-[#484456]/40" />
            <span className="text-text-muted text-xs">ou</span>
            <div className="flex-1 h-px bg-[#484456]/40" />
          </div>

          <button
            onClick={() => setSource('new')}
            className="w-full flex items-center gap-4 bg-surface-2 border border-[#484456]/40 hover:border-[#6c3ff5]/50 hover:bg-surface-3 rounded-[18px] p-5 text-left transition-all active:scale-[0.98]"
          >
            <Sparkles size={28} className="text-[#ffb59d] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-text font-bold font-headline">Nouveau quiz avec l&apos;IA</p>
              <p className="text-text-muted text-sm mt-0.5">Importer un document et générer les questions</p>
            </div>
            <ChevronRight size={18} className="text-text-muted" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#12121f] pb-32">

      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#12121f]/80 backdrop-blur-xl">
        <div className="flex justify-between items-center px-6 py-5">
          <button onClick={() => setSource('choose')} className="w-10 h-10 flex items-center justify-center text-text">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-headline font-extrabold text-lg tracking-tight text-text uppercase">Nouvelle partie</h1>
          <span className="text-text-muted font-bold text-sm">{step}/4</span>
        </div>
        {/* Progress bar */}
        <div className="w-full px-6 pb-4">
          <div className="flex h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-full transition-colors ${s <= step ? 'bg-[#6c3ff5] shadow-[0_0_12px_rgba(108,63,245,0.4)]' : 'bg-surface-2'}`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="px-6 py-4">
        <AnimatePresence mode="wait">

          {/* Étape 1 — Mode */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-2xl font-black text-text font-headline tracking-tight">Mode de jeu</h2>
              <div className="space-y-4">
                {([
                  { value: 'bluff' as GameMode, title: 'Bluff sur cours', desc: 'Importe un PDF/DOCX et invente de faux mots', icon: Drama, color: '#cbbeff', badge: 'BLUFF' },
                  { value: 'annales' as GameMode, title: 'Annales QCM', desc: 'Analyse des examens et trouve la bonne combinaison', icon: FileQuestion, color: '#ffb59d', badge: 'QCM' },
                ] as const).map(({ value, title, desc, icon: Icon, color, badge }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`w-full flex items-center gap-4 bg-surface-2 rounded-[18px] p-5 text-left transition-all border-2 active:scale-[0.98] ${
                      mode === value ? 'border-[#6c3ff5] bg-[#6c3ff5]/10' : 'border-[#484456]/30 hover:border-[#6c3ff5]/40'
                    }`}
                  >
                    <Icon size={28} style={{ color }} className="flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-text font-bold font-headline">{title}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          value === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                        }`}>{badge}</span>
                      </div>
                      <p className="text-text-muted text-sm">{desc}</p>
                    </div>
                    {mode === value && <div className="w-5 h-5 bg-[#6c3ff5] rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full h-14 bg-gradient-to-r from-[#6c3ff5] to-primary-tint rounded-xl flex items-center justify-center gap-2 font-headline font-extrabold text-[#e9e1ff] text-base shadow-lg shadow-[#6c3ff5]/20 active:scale-[0.98] transition-all"
              >
                Continuer <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* Étape 2 — Upload */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {/* Mode badge */}
              <div className="flex">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                  mode === 'bluff' ? 'bg-[#6c3ff5]/20 border-[#6c3ff5]/30' : 'bg-[#b83900]/20 border-[#b83900]/30'
                }`}>
                  {mode === 'bluff' ? <Drama size={14} className="text-[#cbbeff]" /> : <FileQuestion size={14} className="text-[#ffb59d]" />}
                  <span className={`text-[10px] font-headline font-black tracking-widest uppercase ${mode === 'bluff' ? 'text-[#cbbeff]' : 'text-[#ffb59d]'}`}>
                    {mode === 'bluff' ? 'BLUFF MODE' : 'QCM MODE'}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-text font-headline tracking-tight">Importe ton cours</h2>
              <UploadZone
                onFileSelect={handleFileSelect}
                onTextPaste={handleTextPaste}
                isProcessing={isProcessing}
                processingStep={processingStep}
                wordCount={wordCount}
              />
            </motion.div>
          )}

          {/* Étape 3 — Axes du cours */}
          {step === 3 && chapters.length > 0 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-2xl font-extrabold text-text font-headline tracking-tight">Sélectionne les axes</h2>
              <p className="text-text-muted text-sm">Choisis les parties du cours sur lesquelles tu veux jouer</p>
              <ChapterSelector chapters={chapters} selectedChapters={selectedChapters} onSelectionChange={setSelectedChapters} />
              <button
                onClick={() => setStep(4)}
                disabled={selectedChapters.length === 0}
                className="w-full h-14 bg-gradient-to-r from-[#6c3ff5] to-primary-tint rounded-xl flex items-center justify-center gap-2 font-headline font-extrabold text-[#e9e1ff] text-base shadow-lg shadow-[#6c3ff5]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuer <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* Étape 4 — Configuration */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <h2 className="text-2xl font-extrabold text-text font-headline tracking-tight">Configuration</h2>

              <div className="space-y-3">
                <label className="text-text font-semibold text-sm tracking-wide uppercase">Nombre de questions</label>
                <div className="flex gap-2">
                  {NB_QUESTIONS_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setNbQuestions(n)}
                      className={`flex-1 py-3 rounded-xl font-headline font-bold transition-all border-2 ${
                        nbQuestions === n
                          ? 'bg-[#6c3ff5] border-[#6c3ff5] text-[#e9e1ff]'
                          : 'bg-surface-2 border-[#484456]/40 text-text hover:border-[#6c3ff5]/40'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>


              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full h-14 bg-gradient-to-r from-[#6c3ff5] to-primary-tint rounded-xl font-headline font-extrabold text-[#e9e1ff] text-base shadow-lg shadow-[#6c3ff5]/20 active:scale-[0.98] transition-all"
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {processingStep || 'Création en cours…'}
                  </span>
                ) : '⚡ Générer et créer la partie'}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

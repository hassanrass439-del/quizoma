'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { UploadZone } from '@/components/upload/UploadZone'
import { ChapterSelector } from '@/components/upload/ChapterSelector'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import type { Chapter } from '@/types/ai.types'
import type { GameMode } from '@/types/game.types'

const NB_QUESTIONS_OPTIONS = [4, 10, 15, 20]
const TIMER_OPTIONS = [30, 45, 60]

export default function CreatePage() {
  const router = useRouter()
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

  async function handleFileSelect(file: File) {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/ai/parse-document', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setRawText(data.text)
      setChapters(data.chapters)
      setSelectedChapters(data.chapters.map((c: Chapter) => c.title))
      setWordCount(data.wordCount)
      setStep(data.chapters.length > 0 ? 3 : 4)
    } catch {
      toast.error('Erreur lors de l\'extraction du document')
    } finally {
      setIsProcessing(false)
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
        body: JSON.stringify({ mode, text: selectedText, config: { nb_questions: nbQuestions, timer_seconds: timerSeconds } }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { code } = await res.json()
      router.push(`/lobby/${code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
      setIsCreating(false)
    }
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
              <span className="text-3xl flex-shrink-0">📂</span>
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
            <span className="text-3xl flex-shrink-0">✨</span>
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
                  { value: 'bluff' as GameMode, title: 'Bluff sur cours', desc: 'Importe un PDF/DOCX et invente de faux mots', emoji: '🎭', badge: 'BLUFF' },
                  { value: 'annales' as GameMode, title: 'Annales QCM', desc: 'Analyse des examens et trouve la bonne combinaison', emoji: '📝', badge: 'QCM' },
                ] as const).map(({ value, title, desc, emoji, badge }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`w-full flex items-center gap-4 bg-surface-2 rounded-[18px] p-5 text-left transition-all border-2 active:scale-[0.98] ${
                      mode === value ? 'border-[#6c3ff5] bg-[#6c3ff5]/10' : 'border-[#484456]/30 hover:border-[#6c3ff5]/40'
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0">{emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-text font-bold font-headline">{title}</p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          value === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                        }`}>{badge}</span>
                      </div>
                      <p className="text-text-muted text-sm">{desc}</p>
                    </div>
                    {mode === value && <div className="w-5 h-5 bg-[#6c3ff5] rounded-full flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>}
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
                  <span className="text-sm">{mode === 'bluff' ? '🎭' : '📝'}</span>
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
                wordCount={wordCount}
              />
            </motion.div>
          )}

          {/* Étape 3 — Chapitres */}
          {step === 3 && chapters.length > 0 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
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

              <div className="space-y-3">
                <label className="text-text font-semibold text-sm tracking-wide uppercase">Timer par question</label>
                <div className="flex gap-2">
                  {TIMER_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimerSeconds(t)}
                      className={`flex-1 py-3 rounded-xl font-headline font-bold transition-all border-2 ${
                        timerSeconds === t
                          ? 'bg-[#6c3ff5] border-[#6c3ff5] text-[#e9e1ff]'
                          : 'bg-surface-2 border-[#484456]/40 text-text hover:border-[#6c3ff5]/40'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full h-14 bg-gradient-to-r from-[#6c3ff5] to-primary-tint rounded-xl font-headline font-extrabold text-[#e9e1ff] text-base shadow-lg shadow-[#6c3ff5]/20 active:scale-[0.98] transition-all"
              >
                {isCreating ? '⚡ Génération…' : '⚡ Générer et créer la partie'}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

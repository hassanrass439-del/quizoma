'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/button'
import { UploadZone } from '@/components/upload/UploadZone'
import { ChapterSelector } from '@/components/upload/ChapterSelector'
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

      const res = await fetch('/api/ai/parse-document', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      setRawText(data.text)
      setChapters(data.chapters)
      setSelectedChapters(data.chapters.map((c: Chapter) => c.title))
      setWordCount(data.wordCount)
      setStep(data.chapters.length > 0 ? 3 : 4)
    } catch (err) {
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
    setStep(chapters.length > 0 ? 3 : 4)
  }

  async function handleCreate() {
    setIsCreating(true)
    try {
      // Sélectionner le texte des chapitres choisis
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
          config: { nb_questions: nbQuestions, timer_seconds: timerSeconds },
        }),
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
      <div className="flex flex-col min-h-full">
        <MobileHeader title="Nouvelle partie" backHref="/dashboard" />
        <div className="flex-1 px-4 py-8 space-y-5">
          <div>
            <h2 className="text-xl font-black text-text">Créer une partie</h2>
            <p className="text-muted-game text-sm mt-1">Choisis ton point de départ</p>
          </div>

          <Link href="/library">
            <button className="w-full flex items-start gap-4 bg-surface-2 border-2 border-game-border hover:border-primary/50 rounded-card p-5 text-left transition-all">
              <span className="text-3xl flex-shrink-0">📂</span>
              <div>
                <p className="text-text font-bold">Depuis ma bibliothèque</p>
                <p className="text-muted-game text-sm mt-0.5">Utiliser un quiz déjà créé — sans IA, instantané</p>
              </div>
            </button>
          </Link>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-game-border" />
            <span className="text-muted-game text-xs">ou</span>
            <div className="flex-1 h-px bg-game-border" />
          </div>

          <button
            onClick={() => setSource('new')}
            className="w-full flex items-start gap-4 bg-surface-2 border-2 border-game-border hover:border-primary/50 rounded-card p-5 text-left transition-all"
          >
            <span className="text-3xl flex-shrink-0">✨</span>
            <div>
              <p className="text-text font-bold">Nouveau quiz</p>
              <p className="text-muted-game text-sm mt-0.5">Importer un nouveau document et générer avec l&apos;IA</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader title="Nouvelle partie" />
      <div className="px-4 pt-3">
        <button
          onClick={() => setSource('choose')}
          className="text-muted-game text-sm flex items-center gap-1 hover:text-text transition-colors"
        >
          ← Retour au choix
        </button>
      </div>

      {/* Indicateur d'étapes */}
      <div className="px-4 pt-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>
        <p className="text-muted-game text-xs mt-1">Étape {step}/4</p>
      </div>

      <div className="flex-1 px-4 py-5">
        <AnimatePresence mode="wait">

          {/* Étape 1 — Choix du mode */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-black text-text">Mode de jeu</h2>
              <div className="space-y-3">
                {([
                  { value: 'bluff' as GameMode, title: 'Bluff sur cours', desc: 'Importe un PDF/DOCX et invente de faux mots', emoji: '🎭' },
                  { value: 'annales' as GameMode, title: 'Annales QCM', desc: 'Analyse des examens et trouve la bonne combinaison', emoji: '📝' },
                ] as const).map(({ value, title, desc, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`w-full flex items-start gap-4 bg-surface-2 border-2 rounded-card p-5 text-left transition-all ${
                      mode === value
                        ? 'border-primary scale-[1.01]'
                        : 'border-game-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0">{emoji}</span>
                    <div>
                      <p className="text-text font-bold">{title}</p>
                      <p className="text-muted-game text-sm mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
              >
                Continuer →
              </Button>
            </motion.div>
          )}

          {/* Étape 2 — Upload */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-black text-text">Importer le contenu</h2>
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
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <ChapterSelector
                chapters={chapters}
                selectedChapters={selectedChapters}
                onSelectionChange={setSelectedChapters}
              />
              <Button
                onClick={() => setStep(4)}
                disabled={selectedChapters.length === 0}
                className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
              >
                Continuer →
              </Button>
            </motion.div>
          )}

          {/* Étape 4 — Configuration */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-black text-text">Configuration</h2>

              <div className="space-y-2">
                <label className="text-text font-semibold text-sm">Nombre de questions</label>
                <div className="flex gap-2">
                  {NB_QUESTIONS_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setNbQuestions(n)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
                        nbQuestions === n
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface-2 border-game-border text-text hover:border-primary/50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-text font-semibold text-sm">Timer par question</label>
                <div className="flex gap-2">
                  {TIMER_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimerSeconds(t)}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all border ${
                        timerSeconds === t
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface-2 border-game-border text-text hover:border-primary/50'
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
                className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button text-base"
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

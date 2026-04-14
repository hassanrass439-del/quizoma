'use client'

import { Suspense, lazy, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RotateCcw, Home, BookMarked, X, RefreshCw, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, Question } from '@/types/game.types'

const PodiumFinal = lazy(() =>
  import('@/components/game/PodiumFinal').then((m) => ({ default: m.PodiumFinal }))
)

interface Props {
  code: string
  gameId: string
  ranking: Array<{ player: Profile; score: number; rank: number }>
  questions: Question[]
  isHost: boolean
  hasSource: boolean
  mode: 'bluff' | 'annales'
  totalQuestionsInSource: number
  playedQuestionCount: number
}

export function ResultsClient({ code, gameId, ranking, questions, isHost, hasSource, mode, totalQuestionsInSource, playedQuestionCount }: Props) {
  const router = useRouter()
  const [saveState, setSaveState] = useState<'idle' | 'form' | 'saved'>('idle')
  const [quizTitle, setQuizTitle] = useState(`Quiz du ${new Date().toLocaleDateString('fr-FR')}`)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!quizTitle.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, title: quizTitle.trim() }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      toast.success('Quiz sauvegardé dans ta bibliothèque 📚')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader
        title={<span className="flex items-center gap-2"><Trophy size={18} className="text-[#ffb59d]" /> Podium final</span>}
        actions={<img src="/logo.png" alt="Quizoma" className="w-8 h-8 rounded-lg" />}
      />

      <div className="flex-1 px-4 py-5 space-y-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <PodiumFinal ranking={ranking} />
        </Suspense>

        {/* ── Actions ── */}
        <div className="space-y-3">

          {/* Action A — Continuer (host only) */}
          {isHost && hasSource && (playedQuestionCount < totalQuestionsInSource) && (
            <button
              onClick={() => router.push(`/create?reuse=${code}&skip=${playedQuestionCount}`)}
              className="w-full flex items-center gap-4 bg-[#6c3ff5]/10 border border-[#6c3ff5]/30 rounded-xl p-4 text-left hover:bg-[#6c3ff5]/20 transition-all active:scale-[0.98]"
            >
              <RefreshCw size={22} className="text-[#cbbeff]" />
              <div className="flex-1">
                <p className="text-text font-bold text-sm">
                  {mode === 'bluff' ? 'Continuer avec un autre axe' : 'Continuer sur le reste des questions'}
                </p>
                <p className="text-text-muted text-xs">
                  {mode === 'bluff'
                    ? 'Rejouer sur un autre chapitre du même cours'
                    : `${totalQuestionsInSource - playedQuestionCount} questions restantes`
                  }
                </p>
              </div>
            </button>
          )}

          {/* Action B — Sauvegarder (host only) */}
          {isHost && saveState === 'idle' && questions.length > 0 && (
            <button
              onClick={() => setSaveState('form')}
              className="w-full flex items-center gap-4 bg-surface-2 border border-game-border rounded-xl p-4 text-left hover:bg-surface-3 transition-all active:scale-[0.98]"
            >
              <BookMarked size={22} className="text-[#cbbeff]" />
              <div className="flex-1">
                <p className="text-text font-bold text-sm">Enregistrer dans ma bibliothèque</p>
                <p className="text-text-muted text-xs">Rejouer ce quiz plus tard sans re-uploader</p>
              </div>
            </button>
          )}

          {saveState === 'form' && (
            <div className="bg-surface-2 border border-game-border rounded-xl p-4 space-y-3">
              <p className="text-text font-semibold text-sm">Nom du quiz</p>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ex: Pharmacologie Ch.3"
                maxLength={100}
                className="min-input bg-surface-3 border-game-border text-text"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !quizTitle.trim()}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button
                  onClick={() => setSaveState('idle')}
                  variant="outline"
                  className="border-game-border bg-surface-2 text-muted-game rounded-xl"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}

          {saveState === 'saved' && (
            <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <BookMarked size={18} className="text-success shrink-0" />
              <div>
                <p className="text-success font-semibold text-sm">Quiz sauvegardé !</p>
                <Link href="/library" className="text-primary-light text-xs underline">
                  Voir ma bibliothèque →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Retour */}
        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full min-button bg-surface-2 border border-game-border text-text hover:bg-surface-3 rounded-button font-semibold gap-2">
              <RotateCcw size={18} />
              Rejoindre une nouvelle partie
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

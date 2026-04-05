'use client'

import { Suspense, lazy, useState } from 'react'
import Link from 'next/link'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, RotateCcw, Home, BookMarked, X } from 'lucide-react'
import { exportFlashcardsCSV } from '@/lib/utils/exportCSV'
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
}

export function ResultsClient({ code, gameId, ranking, questions }: Props) {
  const [saveState, setSaveState] = useState<'banner' | 'form' | 'saved' | 'dismissed'>('banner')
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
      <MobileHeader title="Podium final 🏆" />

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

        {/* Bannière sauvegarde bibliothèque */}
        {saveState === 'banner' && questions.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <BookMarked size={20} className="text-primary-light shrink-0 mt-0.5" />
                <div>
                  <p className="text-text font-semibold text-sm">Sauvegarder ce quiz ?</p>
                  <p className="text-muted-game text-xs mt-0.5">Rejoue-le plus tard sans re-uploader</p>
                </div>
              </div>
              <button onClick={() => setSaveState('dismissed')} className="text-muted-game hover:text-text">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => setSaveState('form')}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-2 text-sm"
              >
                Oui, sauvegarder
              </Button>
              <Button
                onClick={() => setSaveState('dismissed')}
                variant="outline"
                className="flex-1 border-game-border bg-surface-2 text-muted-game rounded-xl py-2 text-sm"
              >
                Non merci
              </Button>
            </div>
          </div>
        )}

        {saveState === 'form' && (
          <div className="bg-surface-2 border border-game-border rounded-xl p-4 space-y-3">
            <p className="text-text font-semibold text-sm">Nom du quiz dans ta bibliothèque</p>
            <Input
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Ex: Pharmacologie Ch.3"
              maxLength={100}
              className="min-input bg-surface-3 border-game-border text-text"
            />
            <Button
              onClick={handleSave}
              disabled={isSaving || !quizTitle.trim()}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold rounded-xl"
            >
              {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder dans ma bibliothèque'}
            </Button>
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

        {/* Actions */}
        <div className="space-y-3">
          {questions.length > 0 && (
            <Button
              onClick={() => exportFlashcardsCSV(questions)}
              variant="outline"
              className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold gap-2"
            >
              <Download size={18} />
              Exporter les flashcards (.csv)
            </Button>
          )}

          <Link href="/create">
            <Button
              variant="outline"
              className="w-full min-button border-primary/30 bg-primary/10 text-primary-light hover:bg-primary/20 rounded-button font-semibold gap-2"
            >
              <RotateCcw size={18} />
              Rejouer avec le même cours
            </Button>
          </Link>

          <Link href="/dashboard" className="mt-2 block">
            <Button className="w-full min-button bg-surface-2 border border-game-border text-text hover:bg-surface-3 rounded-button font-semibold gap-2">
              <Home size={18} />
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

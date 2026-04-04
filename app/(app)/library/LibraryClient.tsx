'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface QuizLibraryItem {
  id: string
  title: string
  subject: string | null
  mode: 'bluff' | 'annales'
  total_questions: number
  play_count: number
  last_played_at: string | null
  created_at: string
}

interface Props {
  initialQuizzes: QuizLibraryItem[]
}

const FILTERS = ['Tous', 'Bluff', 'Annales', 'Médecine', 'Pharmacie', 'Droit', 'Biologie', 'Autre'] as const
type Filter = (typeof FILTERS)[number]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function LibraryClient({ initialQuizzes }: Props) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<QuizLibraryItem[]>(initialQuizzes)
  const [activeFilter, setActiveFilter] = useState<Filter>('Tous')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (activeFilter === 'Tous') return true
    if (activeFilter === 'Bluff') return quiz.mode === 'bluff'
    if (activeFilter === 'Annales') return quiz.mode === 'annales'
    return quiz.subject?.toLowerCase() === activeFilter.toLowerCase()
  })

  async function handlePlay(quiz: QuizLibraryItem) {
    setPlayingId(quiz.id)
    try {
      const res = await fetch('/api/game/create-from-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quiz.id,
          config: { nb_questions: quiz.total_questions, timer_seconds: 30 },
        }),
      })
      const data: { code?: string; error?: string } = await res.json()
      if (!res.ok || !data.code) {
        toast.error(data.error ?? 'Erreur lors du lancement')
        return
      }
      router.push('/lobby/' + data.code)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setPlayingId(null)
    }
  }

  function startRename(quiz: QuizLibraryItem) {
    setRenamingId(quiz.id)
    setRenameValue(quiz.title)
  }

  async function saveRename(id: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenameSaving(true)
    try {
      const res = await fetch(`/api/library/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
      if (!res.ok) {
        toast.error('Erreur lors du renommage')
        return
      }
      setQuizzes((prev) =>
        prev.map((q) => (q.id === id ? { ...q, title: trimmed } : q))
      )
      setRenamingId(null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setRenameSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/library/${deleteTargetId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error('Erreur lors de la suppression')
        return
      }
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteTargetId))
      setDeleteTargetId(null)
      toast.success('Quiz supprimé')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeleting(false)
    }
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 pt-16 text-center px-4">
        <span className="text-6xl">📚</span>
        <p className="text-text font-bold text-xl">Ta bibliothèque est vide</p>
        <p className="text-muted-game text-sm">Crée ton premier quiz pour commencer !</p>
        <Link href="/create">
          <Button>Créer mon premier quiz</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-6">
      {/* Filter pills */}
      <div className="overflow-x-auto scrollbar-none px-4 py-3">
        <div className="flex gap-2 w-max">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-muted-game hover:bg-surface-3',
              ].join(' ')}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Quiz list */}
      <div className="flex flex-col gap-3 px-4 pt-1">
        {filteredQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-muted-game text-sm">Aucun quiz dans cette catégorie</p>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-surface-2 rounded-2xl border border-game-border p-4 flex flex-col gap-3"
            >
              {/* Header row */}
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{quiz.mode === 'bluff' ? '🎭' : '📝'}</span>
                <div className="flex-1 min-w-0">
                  {renamingId === quiz.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(quiz.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="h-7 text-sm"
                        autoFocus
                        maxLength={100}
                      />
                      <Button
                        size="sm"
                        onClick={() => saveRename(quiz.id)}
                        disabled={renameSaving}
                      >
                        OK
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRenamingId(null)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <p className="text-text font-semibold text-base leading-tight truncate">
                      {quiz.title}
                    </p>
                  )}
                  <p className="text-muted-game text-xs mt-0.5">
                    {quiz.mode === 'bluff' ? 'Bluff' : 'Annales'}
                    {quiz.subject ? ` · ${quiz.subject}` : ''}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-game-border" />

              {/* Stats row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-game">
                <span>📝 {quiz.total_questions} question{quiz.total_questions !== 1 ? 's' : ''}</span>
                <span>🎮 Joué {quiz.play_count} fois</span>
                <span>⏰ Dernière : {formatDate(quiz.last_played_at)}</span>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-white hover:bg-primary-dark"
                  onClick={() => handlePlay(quiz)}
                  disabled={playingId === quiz.id}
                >
                  {playingId === quiz.id ? 'Lancement…' : 'Jouer →'}
                </Button>

                <AlertDialog
                  open={deleteTargetId === quiz.id}
                  onOpenChange={(open) => {
                    if (!open) setDeleteTargetId(null)
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Options" />}>
                      ···
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => startRename(quiz)}>
                        ✏️ Renommer
                      </DropdownMenuItem>
                      <AlertDialogTrigger render={<DropdownMenuItem variant="destructive" onSelect={() => setDeleteTargetId(quiz.id)} />}>
                        🗑️ Supprimer
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le quiz &ldquo;{quiz.title}&rdquo; sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={confirmDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Suppression…' : 'Supprimer'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

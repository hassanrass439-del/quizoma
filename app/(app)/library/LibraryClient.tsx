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
import { Play, MoreHorizontal, Pencil, Trash2, FileText, HelpCircle, Clock, Gamepad2, Plus, Search } from 'lucide-react'

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

const FILTERS = ['Tous', 'Bluff', 'Annales'] as const
type Filter = (typeof FILTERS)[number]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Jamais'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
  return formatDate(dateStr)
}

export function LibraryClient({ initialQuizzes }: Props) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<QuizLibraryItem[]>(initialQuizzes)
  const [activeFilter, setActiveFilter] = useState<Filter>('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredQuizzes = quizzes.filter((quiz) => {
    if (activeFilter === 'Bluff' && quiz.mode !== 'bluff') return false
    if (activeFilter === 'Annales' && quiz.mode !== 'annales') return false
    if (searchQuery && !quiz.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
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
      if (!res.ok) { toast.error('Erreur lors du renommage'); return }
      setQuizzes((prev) => prev.map((q) => (q.id === id ? { ...q, title: trimmed } : q)))
      setRenamingId(null)
    } catch { toast.error('Erreur réseau') } finally { setRenameSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/library/${deleteTargetId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteTargetId))
      setDeleteTargetId(null)
      toast.success('Quiz supprimé')
    } catch { toast.error('Erreur réseau') } finally { setDeleting(false) }
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5 pt-20 text-center px-6">
        <div className="w-16 h-16 bg-[#1e1e2c] rounded-2xl flex items-center justify-center">
          <FileText size={28} className="text-[#cbbeff]" />
        </div>
        <div>
          <p className="text-[#e3e0f4] font-bold text-xl font-headline">Bibliothèque vide</p>
          <p className="text-[#938ea2] text-sm mt-1">Crée ton premier quiz pour commencer</p>
        </div>
        <Link href="/create">
          <Button className="bg-[#6c3ff5] hover:brightness-110 text-white font-bold rounded-xl px-6 gap-2">
            <Plus size={18} />
            Créer un quiz
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-6">

      {/* Search + Filters */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#938ea2]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un quiz..."
            className="w-full bg-[#1e1e2c] border border-[#484456]/40 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#e3e0f4] placeholder:text-[#938ea2] focus:outline-none focus:border-[#6c3ff5]/60"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFilter === filter
                  ? 'bg-[#6c3ff5] text-white'
                  : 'bg-[#1e1e2c] text-[#cac3d9] border border-[#484456] hover:border-[#6c3ff5]/50'
              }`}
            >
              {filter}
            </button>
          ))}
          <span className="ml-auto text-[#938ea2] text-xs font-bold self-center">
            {filteredQuizzes.length} quiz
          </span>
        </div>
      </div>

      {/* Quiz list */}
      <div className="flex flex-col gap-3 px-4 pt-1">
        {filteredQuizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Search size={24} className="text-[#938ea2]" />
            <p className="text-[#938ea2] text-sm">Aucun quiz trouvé</p>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-[#1e1e2c] rounded-2xl border border-[#484456]/30 overflow-hidden"
            >
              {/* Main content */}
              <div className="p-4 flex items-center gap-3">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  quiz.mode === 'bluff' ? 'bg-[#6c3ff5]/15' : 'bg-[#b83900]/15'
                }`}>
                  {quiz.mode === 'bluff'
                    ? <FileText size={20} className="text-[#cbbeff]" />
                    : <HelpCircle size={20} className="text-[#ffb59d]" />
                  }
                </div>

                {/* Info */}
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
                        className="h-7 text-sm bg-[#292937] border-[#484456]"
                        autoFocus
                        maxLength={100}
                      />
                      <Button size="sm" onClick={() => saveRename(quiz.id)} disabled={renameSaving}>OK</Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[#e3e0f4] font-bold text-sm leading-tight truncate">{quiz.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#938ea2] font-medium">
                        <span className={`px-1.5 py-0.5 rounded font-black ${
                          quiz.mode === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                        }`}>
                          {quiz.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                        </span>
                        <span className="flex items-center gap-0.5"><HelpCircle size={10} /> {quiz.total_questions}</span>
                        <span className="flex items-center gap-0.5"><Gamepad2 size={10} /> {quiz.play_count}x</span>
                        <span className="flex items-center gap-0.5"><Clock size={10} /> {timeAgo(quiz.created_at)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handlePlay(quiz)}
                    disabled={playingId === quiz.id}
                    className="w-9 h-9 bg-[#6c3ff5] rounded-xl flex items-center justify-center hover:brightness-110 transition-all active:scale-95 disabled:opacity-40"
                  >
                    <Play size={16} className="text-white ml-0.5" />
                  </button>

                  <AlertDialog
                    open={deleteTargetId === quiz.id}
                    onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#292937] transition-colors text-[#938ea2]" aria-label="Options" />}>
                        <MoreHorizontal size={16} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => startRename(quiz)}>
                          <Pencil size={14} className="mr-2" /> Renommer
                        </DropdownMenuItem>
                        <AlertDialogTrigger render={<DropdownMenuItem variant="destructive" onSelect={() => setDeleteTargetId(quiz.id)} />}>
                          <Trash2 size={14} className="mr-2" /> Supprimer
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
                        <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
                          {deleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

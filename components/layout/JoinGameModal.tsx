'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinGameModal({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    const trimmed = code.trim().replace(/\D/g, '')
    if (trimmed.length !== 6) {
      toast.error('Le code doit contenir 6 chiffres')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/game/${trimmed}/join`, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Partie introuvable')
        return
      }
      onOpenChange(false)
      router.push(`/lobby/${trimmed}`)
    } catch {
      toast.error('Impossible de rejoindre la partie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-game-border max-w-[340px] mx-auto">
        <DialogHeader>
          <DialogTitle className="text-text text-xl font-bold">
            Rejoindre une partie
          </DialogTitle>
          <DialogDescription className="text-muted-game">
            Entre le code à 6 chiffres fourni par l&apos;hôte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <Input
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-2xl font-mono tracking-widest min-input bg-surface-3 border-game-border text-text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <Button
            onClick={handleJoin}
            disabled={loading || code.length !== 6}
            className="min-button w-full bg-primary hover:bg-primary-dark font-bold rounded-button"
          >
            {loading ? 'Connexion...' : 'Rejoindre'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

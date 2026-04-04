'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, QrCode } from 'lucide-react'
import { QRScanner } from './QRScanner'

export function JoinGameForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  async function joinWithCode(rawCode: string) {
    const trimmed = rawCode.trim().toUpperCase()
    if (trimmed.length < 4) return

    setIsJoining(true)
    setShowScanner(false)
    try {
      const res = await fetch(`/api/game/${trimmed}/join`, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      router.push(`/lobby/${trimmed}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
      setIsJoining(false)
    }
  }

  const handleScan = useCallback((scannedCode: string) => {
    joinWithCode(scannedCode)
  }, [])

  return (
    <>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Code de partie"
          maxLength={6}
          className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game font-mono uppercase tracking-widest"
          onKeyDown={(e) => e.key === 'Enter' && joinWithCode(code)}
        />
        <Button
          onClick={() => joinWithCode(code)}
          disabled={isJoining || code.trim().length < 4}
          className="min-button bg-surface-2 border border-game-border hover:border-primary/50 text-text font-bold rounded-button shrink-0"
        >
          <LogIn size={18} />
        </Button>
        <Button
          onClick={() => setShowScanner(true)}
          className="min-button bg-surface-2 border border-game-border hover:border-primary/50 text-text font-bold rounded-button shrink-0"
        >
          <QrCode size={18} />
        </Button>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}

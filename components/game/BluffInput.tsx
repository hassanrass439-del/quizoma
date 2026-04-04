'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isBlocked: boolean
  isSubmitting: boolean
  mode: 1 | 2
  disabled?: boolean
}

export function BluffInput({ value, onChange, onSubmit, isBlocked, isSubmitting, mode, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus avec délai pour éviter le saut de page sur iOS
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-3">
      {mode === 1 ? (
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tape ton bluff ici…"
          maxLength={50}
          disabled={disabled || isSubmitting}
          className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game text-base"
          onKeyDown={(e) => e.key === 'Enter' && !isBlocked && value.trim() && onSubmit()}
        />
      ) : (
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
                .toUpperCase()
                .replace(/[^A-E]/g, '')
                .split('')
                .sort()
                .join('')
            )
          }
          placeholder="Ex: ABD"
          maxLength={5}
          disabled={disabled || isSubmitting}
          className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game text-2xl font-mono tracking-widest text-center"
          onKeyDown={(e) => e.key === 'Enter' && !isBlocked && value.trim() && onSubmit()}
        />
      )}

      {isBlocked && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-danger flex-shrink-0" />
          <p className="text-danger text-sm font-medium">
            C&apos;est la bonne réponse ! 🚫 Trouve un bluff.
          </p>
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={!value.trim() || isBlocked || isSubmitting || disabled}
        className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
      >
        {isSubmitting ? 'Envoi…' : 'Soumettre mon bluff'}
      </Button>
    </div>
  )
}

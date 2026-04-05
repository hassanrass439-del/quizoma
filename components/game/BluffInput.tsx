'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

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
    if (mode === 1) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [mode])

  function toggleLetter(letter: string) {
    const current = value.split('').filter((l) => LETTERS.includes(l))
    const next = current.includes(letter)
      ? current.filter((l) => l !== letter)
      : [...current, letter]
    // Trie alphabétiquement comme la vraie réponse
    onChange(next.sort().join(''))
  }

  if (mode === 2) {
    return (
      <div className="space-y-4">
        {/* Boutons A–E */}
        <div className="flex gap-3 justify-center">
          {LETTERS.map((letter) => {
            const selected = value.includes(letter)
            return (
              <button
                key={letter}
                type="button"
                onClick={() => toggleLetter(letter)}
                disabled={disabled || isSubmitting}
                className={`w-12 h-12 rounded-full font-black text-base transition-all active:scale-95 border-2 ${
                  selected
                    ? 'bg-[#6c3ff5] border-[#6c3ff5] text-white shadow-lg shadow-[#6c3ff5]/30'
                    : 'bg-transparent border-[#484456] text-[#cac3d9] hover:border-[#6c3ff5]/60'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {letter}
              </button>
            )
          })}
        </div>

        {/* Combinaison sélectionnée */}
        <div className="text-center">
          <span className="text-[#cbbeff] font-black text-2xl tracking-[0.3em] font-headline">
            {value || '—'}
          </span>
        </div>

        {isBlocked && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-danger flex-shrink-0" />
            <p className="text-danger text-sm font-medium">
              C&apos;est la bonne combinaison ! 🚫 Trouve un piège.
            </p>
          </div>
        )}

        <Button
          onClick={onSubmit}
          disabled={!value || isBlocked || isSubmitting || disabled}
          className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
        >
          {isSubmitting ? 'Envoi…' : 'Soumettre mon bluff'}
        </Button>
      </div>
    )
  }

  // Mode 1 — texte libre
  return (
    <div className="space-y-3">
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

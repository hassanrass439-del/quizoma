'use client'

import { useState, Suspense, lazy } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

// Lazy load QR code (bundle size optimization)
const QRCode = lazy(() => import('qrcode.react').then((m) => ({ default: m.QRCodeSVG })))

interface Props {
  code: string
  gameUrl: string
}

export function GameCodeDisplay({ code, gameUrl }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 bg-surface-2 border border-game-border rounded-card p-6">
      {/* Code */}
      <div className="space-y-1 text-center">
        <p className="text-xs font-semibold text-muted-game uppercase tracking-widest">
          Code de la partie
        </p>
        <div className="flex items-center gap-3">
          <span className="text-5xl font-black font-mono text-text tracking-widest">
            {code}
          </span>
          <button
            onClick={copyCode}
            className="min-touch flex items-center justify-center rounded-xl text-muted-game hover:text-text transition-colors"
            aria-label="Copier le code"
          >
            {copied ? (
              <Check size={20} className="text-success" />
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-xl p-3">
        <Suspense fallback={<div className="w-24 h-24 bg-surface-3 rounded animate-pulse" />}>
          <QRCode value={gameUrl} size={96} level="M" />
        </Suspense>
      </div>

      <p className="text-muted-game text-xs text-center">
        Scanne ou partage le code pour rejoindre
      </p>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (stopped || !containerRef.current) return

        const scanner = new Html5Qrcode('qr-scanner-container')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            // Extraire le code — peut être une URL /lobby/CODE ou juste CODE
            const match = text.match(/\/lobby\/([A-Z0-9]+)/) ?? text.match(/([A-Z0-9]{6})/)
            const code = match ? match[1] : text.trim().toUpperCase()
            onScan(code)
          },
          () => {}
        )
      } catch {
        setError('Caméra inaccessible. Vérifiez les permissions.')
      }
    }

    start()

    return () => {
      stopped = true
      scannerRef.current?.stop().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-surface-1 rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-game-border">
          <div>
            <p className="text-text font-bold">Scanner un QR code</p>
            <p className="text-muted-game text-xs mt-0.5">Pointez la caméra vers le QR code</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-muted-game hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-4xl">📷</p>
              <p className="text-danger text-sm font-semibold">{error}</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <div id="qr-scanner-container" ref={containerRef} className="w-full" />
              {/* Viseur overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-primary rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
                  {/* Ligne de scan animée */}
                  <div className="absolute inset-x-2 h-0.5 bg-primary/70 animate-[scan_2s_linear_infinite]" style={{ top: '50%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

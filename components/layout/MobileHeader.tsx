import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  title: React.ReactNode
  backHref?: string
  actions?: React.ReactNode
}

export function MobileHeader({ title, backHref, actions }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-surface-1/90 backdrop-blur-sm border-b border-game-border">
      <div className="flex items-center gap-3 px-4 h-14">
        {backHref && (
          <Link
            href={backHref}
            className="min-touch flex items-center justify-center rounded-xl text-muted-game hover:text-text transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="flex-1 text-lg font-bold text-text truncate">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

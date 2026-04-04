'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, BookOpen, User } from 'lucide-react'

const navItems = [
  { icon: Home,     label: 'Accueil', href: '/dashboard' },
  { icon: Plus,     label: 'Créer',   href: '/create' },
  { icon: BookOpen, label: 'Biblio',  href: '/library' },
  { icon: User,     label: 'Profil',  href: '/profile' },
]

const HIDDEN_PATHS = ['/play/', '/lobby/', '/results/']

export function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-game-border bg-surface-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center px-3 rounded-xl transition-colors ${
                isActive ? 'text-primary-light' : 'text-muted-game hover:text-text'
              }`}
              aria-label={label}
            >
              <Icon size={22} className={isActive ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

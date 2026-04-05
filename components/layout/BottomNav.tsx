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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-6 h-[72px] bg-[#0d0d1a] shadow-[0_-4px_20px_rgba(108,63,245,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              isActive
                ? 'bg-[#6c3ff5]/20 text-[#cbbeff]'
                : 'text-[#cac3d9] opacity-60 hover:opacity-100 hover:bg-[#1e1e2c]'
            }`}
          >
            <Icon size={22} fill={isActive ? 'currentColor' : 'none'} />
            <span className="font-headline font-extrabold text-[10px] tracking-tight">{label}</span>
            {isActive && <span className="w-1 h-1 bg-primary-tint rounded-full" />}
          </Link>
        )
      })}
    </nav>
  )
}

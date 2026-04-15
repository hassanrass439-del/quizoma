'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

const LABELS: Record<string, string> = {
  '/admin': 'Vue d\'ensemble',
  '/admin/users': 'Utilisateurs',
  '/admin/games': 'Parties',
  '/admin/quizzes': 'Bibliothèque Quiz',
  '/admin/costs': 'Coûts API',
  '/admin/moderation': 'Modération',
  '/admin/stats': 'Statistiques',
  '/admin/settings': 'Paramètres',
}

export function AdminHeader() {
  const pathname = usePathname()
  const title = LABELS[pathname] ?? 'Administration'

  return (
    <header className="h-16 bg-[#12121f] border-b border-[#484456]/30 sticky top-0 z-40 flex items-center justify-between px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#938ea2]">Administration</span>
        <span className="text-[#484456]">/</span>
        <span className="text-[#e3e0f4] font-bold">{title}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          target="_blank"
          className="flex items-center gap-2 text-xs text-[#938ea2] hover:text-[#cbbeff] transition-colors px-3 py-1.5 rounded-lg border border-[#484456]/30 hover:border-[#6c3ff5]/30"
        >
          <ExternalLink size={14} />
          Voir l&apos;app
        </Link>
      </div>
    </header>
  )
}

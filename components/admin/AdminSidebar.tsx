'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Gamepad2, BookOpen, DollarSign, Shield, BarChart3, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Vue d\'ensemble', href: '/admin' },
  { icon: Users, label: 'Utilisateurs', href: '/admin/users' },
  { icon: Gamepad2, label: 'Parties', href: '/admin/games' },
  { icon: BookOpen, label: 'Bibliothèque Quiz', href: '/admin/quizzes' },
  { icon: DollarSign, label: 'Coûts API', href: '/admin/costs' },
  { icon: Shield, label: 'Modération', href: '/admin/moderation' },
  { icon: BarChart3, label: 'Statistiques', href: '/admin/stats' },
  { icon: Settings, label: 'Paramètres', href: '/admin/settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#1e1e2c] border-r border-[#484456]/30 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#484456]/30">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Quizoma" className="w-8 h-8 rounded-lg" />
          <div>
            <span className="font-headline font-extrabold text-lg text-[#e3e0f4]">Quizoma</span>
            <span className="ml-2 text-[10px] font-black bg-[#F87171]/20 text-[#F87171] px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#6c3ff5]/15 text-[#cbbeff] border-l-2 border-[#6c3ff5]'
                  : 'text-[#938ea2] hover:bg-[#292937] hover:text-[#e3e0f4]'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#484456]/30">
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-[#938ea2] hover:text-[#cbbeff] transition-colors">
          <span>← Retour à l&apos;app</span>
        </Link>
      </div>
    </aside>
  )
}

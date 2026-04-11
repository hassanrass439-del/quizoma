'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { VoiceProvider } from '@/contexts/VoiceContext'

const NO_NAV_PATHS = ['/play/', '/lobby/', '/results/']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasNav = !NO_NAV_PATHS.some((p) => pathname.startsWith(p))

  return (
    <VoiceProvider>
      <div className="flex flex-col min-h-dvh">
        <main className={hasNav ? 'flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]' : 'flex-1'}>
          {children}
        </main>
        <BottomNav />
      </div>
    </VoiceProvider>
  )
}

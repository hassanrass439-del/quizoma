'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { VoiceProvider } from '@/contexts/VoiceContext'

const NO_NAV_PATHS = ['/play/', '/lobby/', '/results/']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasNav = !NO_NAV_PATHS.some((p) => pathname.startsWith(p))

  return (
    <div className="flex justify-center min-h-dvh">
      <div className="relative w-full max-w-[430px] min-h-dvh bg-[#12121f] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.6)]" style={{ transform: 'translateZ(0)' }}>
        <VoiceProvider>
          <main className={hasNav ? 'flex-1 pb-[calc(64px+env(safe-area-inset-bottom))]' : 'flex-1'}>
            {children}
          </main>
          <BottomNav />
        </VoiceProvider>
      </div>
    </div>
  )
}

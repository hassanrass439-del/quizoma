'use client'

import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

interface Props {
  text?: string
  subtext?: string
  size?: number
}

export function AILoader({ text = 'Analyse en cours...', subtext, size = 160 }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={require('@/public/animations/ai-loading.json')}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <p className="text-[#e3e0f4] font-bold font-headline text-base">{text}</p>
      {subtext && <p className="text-[#938ea2] text-sm text-center max-w-[250px]">{subtext}</p>}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  durationSeconds: number
  onExpire?: () => void
  size?: number
}

export function TimerCircle({ durationSeconds, onExpire, size = 80 }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const expiredRef = useRef(false)

  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const progress = remaining / durationSeconds
  const strokeDashoffset = circumference * (1 - progress)

  // Color: green → orange → red
  let color = '#34D399'
  if (progress <= 0.5) color = '#FBBF24'
  if (progress <= 0.2) color = '#F87171'

  useEffect(() => {
    setRemaining(durationSeconds)
    expiredRef.current = false
  }, [durationSeconds])

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
      return
    }

    // Vibration à 10 secondes restantes
    if (remaining === 10 && 'vibrate' in navigator) {
      navigator.vibrate(200)
    }

    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining, onExpire])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A4A"
          strokeWidth={6}
        />
        {/* Progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="absolute text-xl font-black tabular-nums"
        style={{ color }}
      >
        {remaining}
      </span>
    </div>
  )
}

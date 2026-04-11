'use client'

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react'
import type { VoiceStatus } from '@/contexts/VoiceContext'

interface Props {
  status: VoiceStatus
  isMuted: boolean
  remoteUsersCount: number
  onToggleMute: () => void
  onJoin: () => void
  onLeave: () => void
}

export function VoiceBar({ status, isMuted, remoteUsersCount, onToggleMute, onJoin, onLeave }: Props) {
  if (status === 'idle' || status === 'error') {
    return (
      <button
        onClick={onJoin}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6c3ff5]/20 border border-[#6c3ff5]/30 text-[#cbbeff] text-xs font-bold hover:bg-[#6c3ff5]/30 transition-all active:scale-95"
      >
        <Phone size={14} />
        {status === 'error' ? 'Réessayer' : 'Rejoindre le vocal'}
      </button>
    )
  }

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e2c] border border-[#484456]/30 text-[#938ea2] text-xs font-bold">
        <div className="w-3 h-3 border-2 border-[#6c3ff5] border-t-transparent rounded-full animate-spin" />
        Connexion...
      </div>
    )
  }

  // Connected
  return (
    <div className="flex items-center gap-2">
      {/* Indicateur connecté */}
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#007551]/20 border border-[#45dfa4]/20 text-[#45dfa4] text-xs font-bold">
        <div className="w-1.5 h-1.5 bg-[#45dfa4] rounded-full animate-pulse" />
        {remoteUsersCount + 1}
      </div>

      {/* Mute/Unmute */}
      <button
        onClick={onToggleMute}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
          isMuted
            ? 'bg-[#b83900]/20 border border-[#b83900]/30 text-[#ffb59d]'
            : 'bg-[#6c3ff5]/20 border border-[#6c3ff5]/30 text-[#cbbeff]'
        }`}
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Quitter */}
      <button
        onClick={onLeave}
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#93000a]/20 border border-[#ffb4ab]/20 text-[#ffb4ab] hover:bg-[#93000a]/30 transition-all active:scale-95"
      >
        <PhoneOff size={16} />
      </button>
    </div>
  )
}

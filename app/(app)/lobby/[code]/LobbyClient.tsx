'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Check, Share2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { avatarUrl, getAvatar } from '@/lib/avatars'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { VoiceBar } from '@/components/game/VoiceBar'
import Image from 'next/image'
import type { Profile } from '@/types/game.types'

interface Props {
  code: string
  gameId: string
  hostId: string
  currentUserId: string
  initialPlayers: Profile[]
}

export function LobbyClient({ code, gameId, hostId, currentUserId, initialPlayers }: Props) {
  const router = useRouter()
  const [players, setPlayers] = useState<Profile[]>(initialPlayers)
  const [isStarting, setIsStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isHost = currentUserId === hostId
  const gameUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/lobby/${code}`
  const voice = useVoiceChat(`lobby-${code}`)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: 'Rejoins Quizoma !', url: gameUrl })
    } else {
      await navigator.clipboard.writeText(gameUrl)
      toast.success('Lien copié !')
    }
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`game:${code}`)
    channel
      .on('broadcast', { event: 'GAME_STATE_CHANGE' }, ({ payload }) => {
        if (payload.status !== 'lobby') router.push(`/play/${code}`)
      })
      .subscribe()

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('game_players')
        .select('user_id, profiles(*)')
        .eq('game_id', gameId)
      if (data) {
        const profiles = data
          .map((p) => (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles))
          .filter(Boolean) as Profile[]
        setPlayers(profiles)
      }
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [code, gameId, router])

  async function handleStart() {
    if (players.length < 2) { toast.error('Il faut au moins 2 joueurs pour démarrer'); return }
    setIsStarting(true)
    try {
      const res = await fetch(`/api/game/${code}/start`, { method: 'POST' })
      if (!res.ok) { const { error } = await res.json(); throw new Error(error) }
      router.push(`/play/${code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-full bg-[#12121f] pb-32">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/60 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4">
        <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center text-text">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-headline font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#6c3ff5] to-[#cbbeff]">
          Salle d&apos;attente
        </h1>
        <VoiceBar
          status={voice.status}
          isMuted={voice.isMuted}
          remoteUsersCount={voice.remoteUsers.length}
          onToggleMute={voice.toggleMute}
          onJoin={voice.join}
          onLeave={voice.leave}
        />
      </header>

      <main className="px-6 pt-4 space-y-8 max-w-md mx-auto">

        {/* Game code — ticket style */}
        <section className="relative">
          <div className="absolute inset-0 bg-[#6c3ff5]/10 blur-3xl -z-10 rounded-full scale-75" />
          <div className="bg-surface-3 rounded-[18px] p-8 border border-[#484456]/20 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* notch */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#12121f] rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#12121f] rounded-full" />
            <span className="text-[11px] font-extrabold text-[#6c3ff5] tracking-[0.3em] uppercase mb-3 block">PARTAGE CE CODE</span>
            <div className="font-headline font-black text-5xl text-text tracking-widest mb-4" style={{ textShadow: '0 0 20px rgba(108,63,245,0.6)' }}>
              {code}
            </div>
            {/* QR Code */}
            <div className="flex justify-center mb-2">
              <div className="bg-white rounded-xl p-2">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(gameUrl)}&bgcolor=ffffff&color=6c3ff5&margin=0`}
                  alt="QR Code"
                  width={140}
                  height={140}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-game mt-1">Scanne pour rejoindre</p>
          </div>
        </section>

        {/* Share row */}
        <section className="flex gap-4">
          <button
            onClick={copyCode}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-xl border border-[#484456] text-text font-bold text-sm hover:bg-surface-2 transition-all active:scale-95"
          >
            {copied ? <Check size={18} className="text-[#45dfa4]" /> : <Copy size={18} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
          <button
            onClick={shareLink}
            className="flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-xl bg-[#ffb59d] text-[#390c00] font-black text-sm hover:brightness-110 shadow-lg shadow-[#ffb59d]/20 transition-all active:scale-95"
          >
            <Share2 size={18} />
            Partager
          </button>
        </section>

        {/* Players */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="font-headline font-extrabold text-lg text-text">Joueurs ({players.length}/7)</h3>
            <div className="flex items-center gap-2 text-text-muted text-xs font-bold">
              <span>Attente</span>
              <span className="flex gap-0.5">
                {[0, 200, 400].map((d) => (
                  <span key={d} className="w-1 h-1 bg-[#cbbeff] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-y-8 gap-x-4">
            {players.map((player, i) => {
              const av = getAvatar(player.avatar_id)
              const isPlayerHost = player.id === hostId
              return (
                <div key={player.id} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    {isPlayerHost && <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">👑</div>}
                    <div className={`w-[60px] h-[60px] rounded-full overflow-hidden border-2 ${isPlayerHost ? 'border-[#6c3ff5] ring-4 ring-[#6c3ff5]/10' : 'border-[#484456]/30'}`}>
                      <Image
                        src={avatarUrl(av.seed, av.bg, 60)}
                        alt={player.pseudo}
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    {!isPlayerHost && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#45dfa4] border-2 border-[#12121f] rounded-full" />}
                  </div>
                  <span className="text-xs font-bold text-text truncate w-full text-center">
                    {player.pseudo}{player.id === currentUserId ? ' (toi)' : ''}
                  </span>
                </div>
              )
            })}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-2 opacity-40">
                <div className="w-[60px] h-[60px] rounded-full border-2 border-dashed border-[#484456] flex items-center justify-center">
                  <span className="text-[#484456] text-xl">+</span>
                </div>
                <span className="text-[10px] font-bold text-[#484456]">Attente…</span>
              </div>
            ))}
          </div>
        </section>

        {/* Host controls */}
        {isHost ? (
          <section className="space-y-3">
            <button
              onClick={handleStart}
              disabled={isStarting || players.length < 2}
              className="w-full h-[56px] rounded-xl bg-gradient-to-r from-[#6c3ff5] to-[#cbbeff] flex items-center justify-center gap-2 text-[#1e0060] font-headline font-black text-lg shadow-xl shadow-[#6c3ff5]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🚀 {isStarting ? 'Démarrage…' : `Lancer la partie (${players.length} joueurs)`}
            </button>
            <p className="text-center text-[11px] text-text-muted/60 font-medium">La partie peut commencer avec 2 joueurs minimum</p>
          </section>
        ) : (
          <div className="bg-surface-2 border border-[#484456]/30 rounded-xl px-4 py-4 text-center">
            <p className="text-text-muted text-sm animate-pulse font-medium">
              En attente du lancement par l&apos;hôte…
            </p>
          </div>
        )}

      </main>
    </div>
  )
}

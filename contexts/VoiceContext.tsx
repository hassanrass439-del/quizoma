'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface VoiceUser {
  uid: number | string
  speaking: boolean
}

interface VoiceContextValue {
  status: VoiceStatus
  isMuted: boolean
  remoteUsers: VoiceUser[]
  currentChannel: string | null
  toggleMute: () => void
  join: (channel: string) => Promise<void>
  leave: () => Promise<void>
}

const VoiceCtx = createContext<VoiceContextValue | null>(null)

export function useVoice() {
  const ctx = useContext(VoiceCtx)
  if (!ctx) throw new Error('useVoice must be inside VoiceProvider')
  return ctx
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [isMuted, setIsMuted] = useState(true)
  const [remoteUsers, setRemoteUsers] = useState<VoiceUser[]>([])
  const [currentChannel, setCurrentChannel] = useState<string | null>(null)

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localTrackRef.current?.close()
      clientRef.current?.leave()
    }
  }, [])

  const join = useCallback(async (channel: string) => {
    // Si déjà connecté au même canal, ne rien faire
    if (currentChannel === channel && status === 'connected') return

    // Si connecté à un autre canal, quitter d'abord
    if (clientRef.current && currentChannel && currentChannel !== channel) {
      localTrackRef.current?.close()
      localTrackRef.current = null
      await clientRef.current.leave()
      clientRef.current = null
      setRemoteUsers([])
    }

    // Si déjà connecté au même canal (reconnexion après navigation)
    if (clientRef.current && currentChannel === channel) return

    try {
      setStatus('connecting')
      setCurrentChannel(channel)

      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
      if (!appId) { setStatus('error'); return }

      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default

      const tokenRes = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const { token, uid } = await tokenRes.json()

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType)
        if (mediaType === 'audio') {
          const remoteTrack = user.audioTrack as IRemoteAudioTrack
          remoteTrack.play()
          setRemoteUsers((prev) => {
            if (prev.some((u) => u.uid === user.uid)) return prev
            return [...prev, { uid: user.uid, speaking: false }]
          })
        }
      })

      client.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      })

      client.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      })

      client.enableAudioVolumeIndicator()
      client.on('volume-indicator', (volumes) => {
        setRemoteUsers((prev) =>
          prev.map((u) => {
            const vol = volumes.find((v) => v.uid === u.uid)
            return { ...u, speaking: (vol?.level ?? 0) > 5 }
          })
        )
      })

      await client.join(appId, channel, token || null, uid ?? 0)

      try {
        const localTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localTrackRef.current = localTrack
        localTrack.setEnabled(false)
        await client.publish([localTrack])
      } catch {
        console.warn('[Voice] Micro refusé, mode écoute seule')
      }

      setStatus('connected')
    } catch (err) {
      console.error('[Voice] Join error:', err)
      setStatus('error')
    }
  }, [currentChannel, status])

  const leave = useCallback(async () => {
    localTrackRef.current?.close()
    localTrackRef.current = null
    await clientRef.current?.leave()
    clientRef.current = null
    setRemoteUsers([])
    setCurrentChannel(null)
    setStatus('idle')
    setIsMuted(true)
  }, [])

  const toggleMute = useCallback(() => {
    const track = localTrackRef.current
    if (!track) return
    const newMuted = !isMuted
    track.setEnabled(!newMuted)
    setIsMuted(newMuted)
  }, [isMuted])

  return (
    <VoiceCtx.Provider value={{ status, isMuted, remoteUsers, currentChannel, toggleMute, join, leave }}>
      {children}
    </VoiceCtx.Provider>
  )
}

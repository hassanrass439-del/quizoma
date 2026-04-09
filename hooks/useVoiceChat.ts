'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AgoraRTC, {
  type IAgoraRTCClient,
  type IMicrophoneAudioTrack,
  type IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface VoiceUser {
  uid: number
  speaking: boolean
}

interface UseVoiceChatReturn {
  status: VoiceStatus
  isMuted: boolean
  remoteUsers: VoiceUser[]
  toggleMute: () => void
  join: () => Promise<void>
  leave: () => Promise<void>
}

export function useVoiceChat(channel: string): UseVoiceChatReturn {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [isMuted, setIsMuted] = useState(true) // Muted par défaut
  const [remoteUsers, setRemoteUsers] = useState<VoiceUser[]>([])

  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null)

  // Nettoyer à la déconnexion
  useEffect(() => {
    return () => {
      localTrackRef.current?.close()
      clientRef.current?.leave()
    }
  }, [])

  const join = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') return

    try {
      setStatus('connecting')

      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID
      if (!appId) {
        console.error('[Voice] AGORA_APP_ID manquant')
        setStatus('error')
        return
      }

      // Demander le token au serveur
      const tokenRes = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      })
      const { token, uid } = await tokenRes.json()

      // Créer le client Agora
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      clientRef.current = client

      // Écouter les utilisateurs distants
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

      // Volume indicator pour détecter qui parle
      client.enableAudioVolumeIndicator()
      client.on('volume-indicator', (volumes) => {
        setRemoteUsers((prev) =>
          prev.map((u) => {
            const vol = volumes.find((v) => v.uid === u.uid)
            return { ...u, speaking: (vol?.level ?? 0) > 5 }
          })
        )
      })

      // Rejoindre le canal (token null = mode APP ID / testing)
      await client.join(appId, channel, token || null, uid ?? 0)

      // Créer et publier le micro (muté par défaut)
      try {
        const localTrack = await AgoraRTC.createMicrophoneAudioTrack()
        localTrackRef.current = localTrack
        localTrack.setEnabled(false)
        await client.publish([localTrack])
      } catch {
        // Micro refusé → mode écoute seule
        console.warn('[Voice] Micro refusé, mode écoute seule')
      }

      setStatus('connected')
    } catch (err) {
      console.error('[Voice] Join error:', err)
      setStatus('error')
    }
  }, [channel, status])

  const leave = useCallback(async () => {
    localTrackRef.current?.close()
    localTrackRef.current = null
    await clientRef.current?.leave()
    clientRef.current = null
    setRemoteUsers([])
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

  return { status, isMuted, remoteUsers, toggleMute, join, leave }
}

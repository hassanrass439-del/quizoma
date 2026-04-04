'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { Button } from '@/components/ui/button'
import { LogOut, Trophy, Gamepad2, Star, Pencil, Check, X } from 'lucide-react'
import { getAvatar, avatarUrl, AVATARS_F, AVATARS_M, ALL_AVATARS } from '@/lib/avatars'
import type { AvatarDef } from '@/lib/avatars'
import Image from 'next/image'

interface Props {
  profile: {
    id: string
    pseudo: string
    avatar_id: string
    total_games: number
    total_score: number
  }
  email: string
}

export function ProfileClient({ profile, email }: Props) {
  const router = useRouter()
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState<string>(profile.avatar_id)
  const [activeTab, setActiveTab] = useState<'f' | 'm'>(() =>
    ALL_AVATARS.find((a) => a.id === profile.avatar_id)?.gender ?? 'f'
  )
  const [isSaving, setIsSaving] = useState(false)

  const currentAvatar = getAvatar(selectedAvatar)
  const currentUrl = avatarUrl(currentAvatar.seed, currentAvatar.bg, 192)
  const displayedAvatars = activeTab === 'f' ? AVATARS_F : AVATARS_M

  async function saveAvatar() {
    if (selectedAvatar === profile.avatar_id) {
      setIsEditingAvatar(false)
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_id: selectedAvatar }),
      })
      if (!res.ok) throw new Error()
      toast.success('Avatar mis à jour !')
      setIsEditingAvatar(false)
      router.refresh()
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  function cancelEdit() {
    setSelectedAvatar(profile.avatar_id)
    setIsEditingAvatar(false)
  }

  return (
    <div className="flex flex-col min-h-full">
      <MobileHeader title="Mon profil" backHref="/dashboard" />

      <div className="flex-1 px-4 py-5 space-y-5">

        {/* Carte profil */}
        <div className="bg-surface-2 border border-game-border rounded-card p-6 flex flex-col items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
              <Image
                src={currentUrl}
                alt={currentAvatar.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            {!isEditingAvatar && (
              <button
                onClick={() => setIsEditingAvatar(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors"
              >
                <Pencil size={14} className="text-white" />
              </button>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black text-text">{profile.pseudo}</h2>
            <p className="text-muted-game text-sm mt-0.5">{currentAvatar.name}</p>
            <p className="text-muted-game text-xs mt-0.5">{email}</p>
          </div>
        </div>

        {/* Picker d'avatar */}
        {isEditingAvatar && (
          <div className="bg-surface-2 border border-primary/30 rounded-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-text font-bold text-sm">Choisir un avatar</p>
              <button onClick={cancelEdit} className="text-muted-game hover:text-text">
                <X size={18} />
              </button>
            </div>

            {/* Tabs F/M */}
            <div className="flex gap-2">
              {(['f', 'm'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                    activeTab === tab
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface-3 border-game-border text-muted-game hover:border-primary/50'
                  }`}
                >
                  {tab === 'f' ? '👩 Féminin' : '👨 Masculin'}
                </button>
              ))}
            </div>

            {/* Grille */}
            <div className="grid grid-cols-4 gap-2">
              {displayedAvatars.map((av: AvatarDef) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    selectedAvatar === av.id
                      ? 'border-primary scale-105'
                      : 'border-transparent hover:border-game-border'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden">
                    <Image
                      src={avatarUrl(av.seed, av.bg, 112)}
                      alt={av.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-[10px] text-muted-game text-center leading-tight line-clamp-1">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>

            <Button
              onClick={saveAvatar}
              disabled={isSaving}
              className="w-full bg-primary hover:bg-primary-dark font-bold rounded-xl gap-2"
            >
              <Check size={16} />
              {isSaving ? 'Sauvegarde…' : 'Confirmer'}
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Parties jouées', value: profile.total_games, icon: Gamepad2, color: 'text-primary-light' },
            { label: 'Score total', value: profile.total_score, icon: Trophy, color: 'text-warning' },
            {
              label: 'Moy./partie',
              value: profile.total_games > 0 ? Math.round(profile.total_score / profile.total_games) : 0,
              icon: Star,
              color: 'text-success',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-2 border border-game-border rounded-xl p-4 text-center">
              <Icon size={20} className={`${color} mx-auto mb-2`} />
              <p className="text-text font-black text-2xl">{value}</p>
              <p className="text-muted-game text-[10px] font-semibold uppercase tracking-wide mt-1 leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Déconnexion */}
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="outline"
            className="w-full min-button border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 font-semibold rounded-button gap-2"
          >
            <LogOut size={18} />
            Se déconnecter
          </Button>
        </form>

      </div>
    </div>
  )
}

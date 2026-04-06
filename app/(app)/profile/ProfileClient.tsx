'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LogOut, Pencil, Check, X, ChevronRight, History, Settings } from 'lucide-react'
import { getAvatar, avatarUrl, AVATARS_F, AVATARS_M, ALL_AVATARS } from '@/lib/avatars'
import type { AvatarDef } from '@/lib/avatars'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  profile: {
    id: string
    pseudo: string
    avatar_id: string
    total_games: number
    total_score: number
    created_at?: string
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
  const avgScore = profile.total_games > 0 ? Math.round(profile.total_score / profile.total_games) : 0

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : ''

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
    <div className="min-h-full bg-[#0d0d1a] pb-32">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/60 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#292937] overflow-hidden border border-[#6c3ff5]/30">
            <Image
              src={avatarUrl(currentAvatar.seed, currentAvatar.bg, 40)}
              alt={currentAvatar.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <h1 className="font-headline font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#6c3ff5] to-[#cbbeff]">
            Profil
          </h1>
        </div>
      </header>

      <main className="px-6 mt-6 space-y-10 max-w-2xl mx-auto">

        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#6c3ff5] to-[#cbbeff] shadow-[0_0_20px_rgba(108,63,245,0.4)]">
              <div className="w-full h-full rounded-full bg-[#0d0d1a] overflow-hidden">
                <Image
                  src={currentUrl}
                  alt={profile.pseudo}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
            {!isEditingAvatar && (
              <button
                onClick={() => setIsEditingAvatar(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#6c3ff5] rounded-full flex items-center justify-center shadow-md hover:brightness-110 transition-all"
              >
                <Pencil size={14} className="text-white" />
              </button>
            )}
          </div>
          <div>
            <h2 className="font-headline font-extrabold text-3xl tracking-tight text-[#e3e0f4]">{profile.pseudo}</h2>
            <p className="text-[#cac3d9] font-medium text-sm mt-1">
              {memberSince ? `Membre depuis ${memberSince}` : email}
            </p>
          </div>
        </section>

        {/* Avatar Picker */}
        {isEditingAvatar && (
          <section className="bg-[#1a1a28] border border-[#6c3ff5]/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[#e3e0f4] font-bold text-sm">Choisir un avatar</p>
              <button onClick={cancelEdit} className="text-[#cac3d9] hover:text-[#e3e0f4]">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2">
              {(['f', 'm'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                    activeTab === tab
                      ? 'bg-[#6c3ff5] border-[#6c3ff5] text-white'
                      : 'bg-[#1e1e2c] border-[#484456] text-[#cac3d9]'
                  }`}
                >
                  {tab === 'f' ? '👩 Féminin' : '👨 Masculin'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {displayedAvatars.map((av: AvatarDef) => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    selectedAvatar === av.id
                      ? 'border-[#6c3ff5] scale-105 shadow-lg shadow-[#6c3ff5]/20'
                      : 'border-transparent'
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
                  <span className="text-[10px] text-[#cac3d9] text-center leading-tight line-clamp-1">
                    {av.name}
                  </span>
                </button>
              ))}
            </div>

            <Button
              onClick={saveAvatar}
              disabled={isSaving}
              className="w-full h-12 bg-[#6c3ff5] hover:brightness-110 font-bold rounded-xl gap-2 text-white"
            >
              <Check size={16} />
              {isSaving ? 'Sauvegarde...' : 'Confirmer'}
            </Button>
          </section>
        )}

        {/* Stats Overview */}
        <section className="grid grid-cols-3 gap-4">
          <div className="bg-[#1e1e2c] rounded-xl p-4 flex flex-col items-center justify-center space-y-1 transition-transform hover:scale-[1.02]">
            <span className="text-[#cbbeff] font-black text-2xl font-headline">{profile.total_games}</span>
            <span className="text-[#cac3d9] text-[10px] uppercase font-bold tracking-widest">Parties</span>
          </div>
          <div className="bg-[#1e1e2c] rounded-xl p-4 flex flex-col items-center justify-center space-y-1 transition-transform hover:scale-[1.02]">
            <span className="text-[#cbbeff] font-black text-2xl font-headline">{profile.total_score}</span>
            <span className="text-[#cac3d9] text-[10px] uppercase font-bold tracking-widest">Points</span>
          </div>
          <div className="bg-[#1e1e2c] rounded-xl p-4 flex flex-col items-center justify-center space-y-1 transition-transform hover:scale-[1.02]">
            <span className="text-[#cbbeff] font-black text-2xl font-headline">{avgScore}</span>
            <span className="text-[#cac3d9] text-[10px] uppercase font-bold tracking-widest">Moyenne</span>
          </div>
        </section>

        {/* Account Menu */}
        <section className="space-y-2">
          <div className="bg-[#1e1e2c] rounded-xl overflow-hidden">
            <button
              onClick={() => setIsEditingAvatar(true)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#383847]/20 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <Pencil size={20} className="text-[#cbbeff]" />
                <span className="font-bold text-[#e3e0f4]">Modifier le profil</span>
              </div>
              <ChevronRight size={18} className="text-[#cac3d9] opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
            <div className="mx-6 h-[1px] bg-[#484456]/10" />
            <Link href="/history" className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#383847]/20 transition-colors group">
              <div className="flex items-center gap-4">
                <History size={20} className="text-[#cbbeff]" />
                <span className="font-bold text-[#e3e0f4]">Historique des parties</span>
              </div>
              <ChevronRight size={18} className="text-[#cac3d9] opacity-40 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Déconnexion */}
          <div className="bg-[#1e1e2c] rounded-xl overflow-hidden mt-4">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#93000a]/20 transition-colors text-[#ffb4ab] group"
              >
                <LogOut size={20} />
                <span className="font-bold">Se déconnecter</span>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

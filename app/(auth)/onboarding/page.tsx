'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { AVATARS_F, AVATARS_M, getAvatar, avatarUrl } from '@/lib/avatars'
import Image from 'next/image'

const pseudoSchema = z.object({
  pseudo: z
    .string()
    .min(3, 'Minimum 3 caractères')
    .max(20, 'Maximum 20 caractères')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Lettres, chiffres, _ et - uniquement'),
})
type PseudoForm = z.infer<typeof pseudoSchema>
type PseudoStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error'

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  )
}

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [pseudoStatus, setPseudoStatus] = useState<PseudoStatus>('idle')
  const [selectedAvatar, setSelectedAvatar] = useState('f_doctor_1')
  const [activeTab, setActiveTab] = useState<'f' | 'm'>('f')
  const [loading, setLoading] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const { register, handleSubmit, watch, formState: { errors }, trigger } = useForm<PseudoForm>({
    resolver: zodResolver(pseudoSchema),
  })
  const watchedPseudo = watch('pseudo', '')

  useEffect(() => {
    if (!watchedPseudo || watchedPseudo.length < 3) { setPseudoStatus('idle'); return }
    const parsed = pseudoSchema.safeParse({ pseudo: watchedPseudo })
    if (!parsed.success) { setPseudoStatus('idle'); return }
    setPseudoStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('profiles').select('id').ilike('pseudo', watchedPseudo).limit(1)
        setPseudoStatus(data && data.length > 0 ? 'taken' : 'available')
      } catch { setPseudoStatus('error') }
    }, 500)
    return () => clearTimeout(timer)
  }, [watchedPseudo])

  async function onSubmit(data: PseudoForm) {
    setSubmitAttempted(true)
    if (pseudoStatus !== 'available') return
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !session) {
      toast.error('Connecte-toi d\'abord.')
      router.push('/login')
      return
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      pseudo: data.pseudo.trim(),
      avatar_id: selectedAvatar,
    })

    if (error) {
      toast.error('Erreur lors de la création du profil')
      setLoading(false)
      return
    }

    toast.success(`Bienvenue ${data.pseudo} 🎉`)
    router.push(next)
    router.refresh()
  }

  const avatar = getAvatar(selectedAvatar)

  return (
    <div className="min-h-dvh flex flex-col bg-[#12121f] px-5 pt-10 pb-8">
      <div className="w-full max-w-[390px] mx-auto flex flex-col gap-7">

        {/* Welcome */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-text font-headline leading-tight">
            Crée ton profil 🎓
          </h1>
          <p className="text-text-muted text-sm mt-1">Choisis un surnom et un avatar pour jouer</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

          {/* Pseudo */}
          <div className="space-y-2">
            <label className="text-text font-bold text-sm">Ton surnom</label>
            <div className="relative">
              <Input
                {...register('pseudo')}
                placeholder="Ex: DrBoss42"
                maxLength={20}
                autoFocus
                className={`min-input bg-[#1e1e2c] text-text placeholder:text-text-muted font-bold text-base pr-10 ${
                  (errors.pseudo || (submitAttempted && !watchedPseudo))
                    ? 'border-danger ring-1 ring-danger/30'
                    : 'border-[#484456]'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
                {pseudoStatus === 'checking' && <span className="animate-spin inline-block text-sm">⏳</span>}
                {pseudoStatus === 'available' && <span>✅</span>}
                {pseudoStatus === 'taken' && <span>❌</span>}
              </div>
            </div>
            {errors.pseudo && <p className="text-danger text-xs px-1">{errors.pseudo.message}</p>}
            {!errors.pseudo && submitAttempted && !watchedPseudo && (
              <p className="text-danger text-xs px-1 font-semibold">Choisis un surnom pour continuer</p>
            )}
            {!errors.pseudo && submitAttempted && pseudoStatus === 'idle' && watchedPseudo && watchedPseudo.length < 3 && (
              <p className="text-danger text-xs px-1 font-semibold">Minimum 3 caractères</p>
            )}
            {pseudoStatus === 'taken' && <p className="text-danger text-xs px-1 font-semibold">Déjà pris, essaie un autre</p>}
          </div>

          {/* Avatar */}
          <div className="space-y-3">
            <label className="text-text font-bold text-sm">Ton avatar</label>

            {/* Tabs */}
            <div className="flex gap-2">
              {(['f', 'm'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveTab(g)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all border ${
                    activeTab === g
                      ? 'bg-[#6c3ff5] border-[#6c3ff5] text-white'
                      : 'bg-[#1e1e2c] border-[#484456] text-text-muted'
                  }`}
                >
                  {g === 'f' ? '👩 Féminin' : '👨 Masculin'}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2">
              {(activeTab === 'f' ? AVATARS_F : AVATARS_M).map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => setSelectedAvatar(av.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border-2 ${
                    selectedAvatar === av.id
                      ? 'border-[#6c3ff5] scale-105 shadow-lg shadow-[#6c3ff5]/20'
                      : 'border-transparent'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden relative">
                    <Image
                      src={avatarUrl(av.seed, av.bg, 112)}
                      alt={av.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    {selectedAvatar === av.id && (
                      <div className="absolute inset-0 rounded-full bg-[#6c3ff5]/20 flex items-start justify-end pr-0.5 pt-0.5">
                        <span className="text-xs bg-[#6c3ff5] text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted font-medium truncate w-full text-center">{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview + CTA */}
          <div className="bg-[#1e1e2c] border border-[#484456] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#6c3ff5]/40 flex-shrink-0">
              <Image
                src={avatarUrl(avatar.seed, avatar.bg, 96)}
                alt={avatar.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-xs">Ton profil joueur</p>
              <p className="text-text font-black text-base font-headline truncate">
                {watchedPseudo || 'Joueur'}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-[#6c3ff5] to-[#cbbeff] text-[#1e0060] font-black font-headline text-base rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {loading ? 'Création...' : 'C\'est parti 🚀'}
          </Button>

        </form>
      </div>
    </div>
  )
}

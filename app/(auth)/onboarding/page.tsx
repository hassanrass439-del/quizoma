'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
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
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [pseudo, setPseudo] = useState('')
  const [pseudoStatus, setPseudoStatus] = useState<PseudoStatus>('idle')
  const [selectedAvatar, setSelectedAvatar] = useState('f_doctor_1')
  const [activeTab, setActiveTab] = useState<'f' | 'm'>('f')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PseudoForm>({
    resolver: zodResolver(pseudoSchema),
  })
  const watchedPseudo = watch('pseudo', '')

  // Debounce pseudo check
  useEffect(() => {
    if (!watchedPseudo || watchedPseudo.length < 3) {
      setPseudoStatus('idle')
      return
    }
    const parsed = pseudoSchema.safeParse({ pseudo: watchedPseudo })
    if (!parsed.success) {
      setPseudoStatus('idle')
      return
    }
    setPseudoStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('pseudo', watchedPseudo)
          .limit(1)
        setPseudoStatus(data && data.length > 0 ? 'taken' : 'available')
      } catch {
        setPseudoStatus('error')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [watchedPseudo])

  function onPseudoSubmit(data: PseudoForm) {
    if (pseudoStatus !== 'available') return
    setPseudo(data.pseudo.trim())
    setStep(3)
  }

  async function handleCreate() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Session expirée, reconnecte-toi.')
      router.push('/login')
      return
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      pseudo,
      avatar_id: selectedAvatar,
    })

    if (error) {
      toast.error('Erreur lors de la création du profil')
      setLoading(false)
      return
    }

    toast.success(`Profil créé ! Bonne chance ${pseudo} 🎉`)
    router.push('/dashboard')
    router.refresh()
  }

  const avatar = getAvatar(selectedAvatar)

  return (
    <div className="min-h-dvh flex flex-col bg-surface-1 px-4 pt-8 pb-10">
      <div className="w-full max-w-[390px] mx-auto flex flex-col flex-1">

        {/* Stepper */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-primary' : 'bg-surface-3'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Étape 1 — Bienvenue */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1 justify-between"
            >
              <div className="flex flex-col items-center text-center gap-6 pt-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="text-7xl"
                >
                  🎓
                </motion.div>
                <div>
                  <h1 className="text-3xl font-black text-text leading-tight">
                    Bienvenue sur<br />
                    <span className="text-primary">Quizoma !</span>
                  </h1>
                  <p className="text-muted-game mt-2 text-sm">Révise en t&apos;amusant avec tes camarades</p>
                </div>
                <div className="w-full space-y-3 text-left">
                  {[
                    { icon: '🧠', text: 'Importe tes cours (PDF, DOCX)' },
                    { icon: '🎭', text: 'Invente de faux bluffs pour piéger tes amis' },
                    { icon: '🏆', text: 'Grimpe dans le classement' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-3 bg-surface-2 border border-game-border rounded-xl px-4 py-3">
                      <span className="text-2xl">{icon}</span>
                      <p className="text-text text-sm font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button text-base mt-8"
              >
                C&apos;est parti →
              </Button>
            </motion.div>
          )}

          {/* Étape 2 — Pseudo */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1 justify-between"
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-text">Comment tu t&apos;appelles ?</h2>
                  <p className="text-muted-game text-sm mt-1">Ton surnom dans le jeu (unique)</p>
                </div>

                <form onSubmit={handleSubmit(onPseudoSubmit)} className="space-y-3">
                  <div className="relative">
                    <Input
                      {...register('pseudo')}
                      placeholder="Ton surnom dans le jeu..."
                      maxLength={20}
                      autoFocus
                      className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game font-bold text-lg pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                      {pseudoStatus === 'checking' && <span className="animate-spin inline-block">⏳</span>}
                      {pseudoStatus === 'available' && <span>✅</span>}
                      {pseudoStatus === 'taken' && <span>❌</span>}
                    </div>
                  </div>

                  {errors.pseudo && (
                    <p className="text-danger text-xs px-1">{errors.pseudo.message}</p>
                  )}
                  {pseudoStatus === 'available' && (
                    <p className="text-success text-xs px-1 font-semibold">Disponible !</p>
                  )}
                  {pseudoStatus === 'taken' && (
                    <p className="text-danger text-xs px-1 font-semibold">Déjà pris, essaie un autre</p>
                  )}

                  <Button
                    type="submit"
                    disabled={pseudoStatus !== 'available'}
                    className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button disabled:opacity-40"
                  >
                    Suivant →
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Étape 3 — Avatar */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex flex-col flex-1 justify-between"
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-text">Choisis ton avatar</h2>
                  <p className="text-muted-game text-sm mt-1">Qui te représente le mieux ?</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                  {(['f', 'm'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setActiveTab(g)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                        activeTab === g
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface-2 border-game-border text-muted-game'
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
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all border-2 ${
                        selectedAvatar === av.id
                          ? 'border-primary scale-105 shadow-lg shadow-primary/20'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden relative">
                        <Image
                          src={avatarUrl(av.seed, av.bg, 128)}
                          alt={av.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                        {selectedAvatar === av.id && (
                          <div className="absolute inset-0 rounded-full bg-primary/20 flex items-start justify-end pr-0.5 pt-0.5">
                            <span className="text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">✓</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-game font-medium truncate w-full text-center">
                        {av.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Preview */}
                <div className="bg-surface-2 border border-game-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={avatarUrl(avatar.seed, avatar.bg, 112)}
                      alt={avatar.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-game">Voici ton profil de joueur :</p>
                    <p className="text-text font-black text-lg">{pseudo || 'Joueur'}</p>
                    <span className="text-xs bg-primary/20 text-primary-light font-semibold px-2 py-0.5 rounded-full">
                      Médecine
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button text-base mt-4"
              >
                {loading ? 'Création...' : 'Créer mon profil 🚀'}
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}

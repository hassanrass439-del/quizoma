'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, UserRound } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent('/onboarding')}` },
    })
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent('/onboarding')}` },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    // Si la session existe directement (email confirm désactivé), aller à l'onboarding
    if (signUpData.session) {
      router.push('/onboarding')
      return
    }
    // Sinon afficher l'écran "vérifie ton email"
    setRegisteredEmail(data.email)
    setEmailSent(true)
    setLoading(false)
  }

  if (emailSent) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-surface-1">
        <div className="w-full max-w-[390px] space-y-6 text-center">
          <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">📧</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-text">Vérifie ton email</h2>
            <p className="text-muted-game text-sm">
              Un email de confirmation a été envoyé à
            </p>
            <p className="text-primary-light font-bold text-sm">{registeredEmail}</p>
            <p className="text-muted-game text-xs mt-4">
              Clique sur le lien dans l&apos;email pour activer ton compte et accéder à l&apos;onboarding.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Button
              onClick={async () => {
                const supabase = createClient()
                const { error } = await supabase.auth.resend({ type: 'signup', email: registeredEmail })
                if (error) toast.error(error.message)
                else toast.success('Email renvoyé !')
              }}
              variant="outline"
              className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold"
            >
              Renvoyer l&apos;email
            </Button>
            <Link href="/login" className="block text-muted-game text-sm hover:text-text transition-colors">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-surface-1">
      <div className="w-full max-w-[390px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/logo.png" alt="Quizoma" className="w-16 h-16 rounded-xl" />
          <h1 className="text-4xl font-black text-primary">Quizoma</h1>
          <p className="text-muted-game text-sm">Crée ton compte</p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </Button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-game-border" />
          <span className="text-muted-game text-xs">ou</span>
          <div className="flex-1 h-px bg-game-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Input
              {...register('email')}
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game"
            />
            {errors.email && <p className="text-danger text-xs px-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe (8 caractères min.)"
                autoComplete="new-password"
                className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-game min-touch flex items-center justify-center"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-danger text-xs px-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <Input
              {...register('confirmPassword')}
              type="password"
              placeholder="Confirmer le mot de passe"
              autoComplete="new-password"
              className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game"
            />
            {errors.confirmPassword && (
              <p className="text-danger text-xs px-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-game-border" />
          <span className="text-muted-game text-xs">ou</span>
          <div className="flex-1 h-px bg-game-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setLoading(true)
            try {
              const res = await fetch('/api/auth/guest', { method: 'POST' })
              if (!res.ok) throw new Error()
              router.push('/dashboard')
              router.refresh()
            } catch {
              toast.error('Erreur lors de la connexion invité')
              setLoading(false)
            }
          }}
          disabled={loading}
          className="w-full min-button border-game-border bg-surface-2 text-muted-game hover:bg-surface-3 hover:text-text rounded-button font-semibold"
        >
          <UserRound size={18} className="mr-2" />
          Continuer en tant qu&apos;invité
        </Button>

        <p className="text-center text-muted-game text-sm">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-primary-light font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

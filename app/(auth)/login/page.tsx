'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-surface-1">
      <div className="w-full max-w-[390px] space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-black text-primary">Quizoma</h1>
          <p className="text-muted-game text-sm">Révise en bluffant 🎓</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Input
              {...register('email')}
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="min-input bg-surface-3 border-game-border text-text placeholder:text-muted-game"
            />
            {errors.email && (
              <p className="text-danger text-xs px-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                autoComplete="current-password"
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
            {errors.password && (
              <p className="text-danger text-xs px-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
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
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-primary-light font-semibold hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

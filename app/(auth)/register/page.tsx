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
import { Eye, EyeOff } from 'lucide-react'

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: `${location.origin}/onboarding` },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    toast.success('Compte créé ! Vérifie ton email.')
    router.push('/onboarding')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-surface-1">
      <div className="w-full max-w-[390px] space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-black text-primary">Quizoma</h1>
          <p className="text-muted-game text-sm">Crée ton compte</p>
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

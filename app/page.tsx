import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Users, Brain, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')
  const features = [
    { icon: Brain, title: 'IA générative', desc: 'Claude analyse tes cours et génère des questions précises' },
    { icon: Users, title: 'Multijoueur', desc: 'Joue avec tes amis en temps réel, jusqu\'à 12 joueurs' },
    { icon: Zap, title: 'Mécanique de bluff', desc: 'Invente de fausses réponses pour piéger tes camarades' },
    { icon: BookOpen, title: 'Export flashcards', desc: 'Exporte tes révisions au format Anki / Quizlet' },
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-surface-1 px-4">
      <div className="flex flex-col items-center justify-center flex-1 py-12 gap-8 max-w-[390px] mx-auto w-full">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-1.5 text-primary-light text-xs font-semibold uppercase tracking-wider">
            Révision gamifiée
          </div>
          <img src="/logo.png" alt="Quizoma" className="w-24 h-24 rounded-2xl mx-auto" />
          <h1 className="text-5xl font-black text-text leading-none">
            Quizoma
          </h1>
          <p className="text-muted-game text-base leading-relaxed">
            Importe tes cours, l&apos;IA génère des questions,
            et tu pièges tes camarades avec de fausses réponses.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface-2 border border-game-border rounded-card p-4 space-y-2">
              <Icon size={20} className="text-primary" />
              <p className="text-text font-bold text-sm">{title}</p>
              <p className="text-muted-game text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full space-y-3">
          <Link href="/register" className="block">
            <Button className="w-full min-button bg-primary hover:bg-primary-dark font-bold rounded-button text-base">
              Commencer gratuitement
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button
              variant="outline"
              className="w-full min-button border-game-border bg-surface-2 text-text hover:bg-surface-3 rounded-button font-semibold"
            >
              Se connecter
            </Button>
          </Link>
        </div>

        {/* Modes */}
        <div className="w-full bg-surface-2 border border-game-border rounded-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-game uppercase tracking-wider">2 modes de jeu</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-xl">🎭</span>
              <div>
                <p className="text-text font-bold text-sm">Bluff sur cours</p>
                <p className="text-muted-game text-xs">PDF/DOCX → questions à trous → invente un faux mot</p>
              </div>
            </div>
            <div className="w-full h-px bg-game-border" />
            <div className="flex items-start gap-3">
              <span className="text-xl">📝</span>
              <div>
                <p className="text-text font-bold text-sm">Annales QCM</p>
                <p className="text-muted-game text-xs">PDF d&apos;examen → IA analyse → trouve la bonne combinaison</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

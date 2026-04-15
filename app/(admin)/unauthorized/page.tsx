import Link from 'next/link'
import { ShieldX } from 'lucide-react'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#0d0d1a] px-4 gap-6">
      <ShieldX size={64} className="text-[#F87171]" />
      <h1 className="text-3xl font-black text-[#e3e0f4] font-headline">Accès refusé</h1>
      <p className="text-[#938ea2] text-center max-w-md">
        Vous n&apos;avez pas les droits pour accéder à cette page. Contactez un administrateur.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-[#6c3ff5] text-white font-bold rounded-xl hover:brightness-110 transition-all"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}

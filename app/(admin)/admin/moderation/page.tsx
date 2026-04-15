import { Shield } from 'lucide-react'

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-[#6c3ff5]" />
        <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">Modération</h1>
      </div>

      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#34D399]/10 flex items-center justify-center">
          <Shield size={32} className="text-[#34D399]" />
        </div>
        <p className="text-lg font-bold text-[#e3e0f4] font-headline">
          Modération - Aucun signalement
        </p>
        <p className="text-sm text-[#938ea2] max-w-md text-center">
          Aucun contenu signalé pour le moment. Les signalements des utilisateurs apparaîtront ici.
        </p>
      </div>
    </div>
  )
}

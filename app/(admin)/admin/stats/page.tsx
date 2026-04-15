import { BarChart3 } from 'lucide-react'

export default function AdminStatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={24} className="text-[#6c3ff5]" />
        <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">Statistiques</h1>
      </div>

      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-12 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#6c3ff5]/10 flex items-center justify-center">
          <BarChart3 size={32} className="text-[#6c3ff5]" />
        </div>
        <p className="text-lg font-bold text-[#e3e0f4] font-headline">
          Statistiques - Fonctionnalité à venir
        </p>
        <p className="text-sm text-[#938ea2] max-w-md text-center">
          Les graphiques et analytics détaillés seront disponibles dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  )
}

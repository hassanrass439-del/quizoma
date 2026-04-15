import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  color: string
  bgColor: string
}

export function KpiCard({ icon: Icon, label, value, change, changeType = 'neutral', color, bgColor }: Props) {
  return (
    <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon size={20} style={{ color }} />
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            changeType === 'up' ? 'bg-[#34D399]/15 text-[#34D399]' :
            changeType === 'down' ? 'bg-[#F87171]/15 text-[#F87171]' :
            'bg-[#484456]/30 text-[#938ea2]'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-[32px] font-extrabold text-[#e3e0f4] font-headline leading-none">{value}</p>
        <p className="text-[13px] text-[#938ea2] mt-1">{label}</p>
      </div>
    </div>
  )
}

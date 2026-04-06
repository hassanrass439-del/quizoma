'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Filter = 'tout' | 'aujourd\'hui' | 'semaine'

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Tout', value: 'tout' },
  { label: "Aujourd'hui", value: "aujourd'hui" },
  { label: 'Cette semaine', value: 'semaine' },
]

interface Entry {
  gameId: string
  code: string
  mode: string
  status: string
  score: number
  createdAt: string
}

interface Props {
  entries: Entry[]
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function HistoryClient({ entries }: Props) {
  const [filter, setFilter] = useState<Filter>('tout')

  const filtered = useMemo(() => {
    if (filter === 'tout') return entries
    const now = new Date()
    let cutoff: Date
    switch (filter) {
      case "aujourd'hui":
        cutoff = startOfDay(now)
        break
      case 'semaine':
        cutoff = startOfWeek(now)
        break
    }
    return entries.filter((e) => new Date(e.createdAt) >= cutoff)
  }, [entries, filter])

  // Grouper par date
  const grouped = useMemo(() => {
    const groups: Record<string, Entry[]> = {}
    for (const e of filtered) {
      const dateKey = new Date(e.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(e)
    }
    return groups
  }, [filtered])

  return (
    <div className="min-h-full bg-[#0d0d1a] pb-32">
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/60 backdrop-blur-xl flex items-center px-6 py-4">
        <Link href="/profile" className="w-10 h-10 flex items-center justify-center text-[#e3e0f4]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-headline font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#6c3ff5] to-[#cbbeff] flex-1 text-center">
          Historique
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-6 space-y-5">

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === value
                  ? 'bg-[#6c3ff5] text-white'
                  : 'bg-[#1e1e2c] text-[#cac3d9] border border-[#484456] hover:border-[#6c3ff5]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Résumé */}
        <div className="flex items-center justify-between">
          <span className="text-[#cac3d9] text-xs font-bold">
            {filtered.length} partie{filtered.length > 1 ? 's' : ''}
          </span>
          <span className="text-[#45dfa4] text-xs font-bold">
            {filtered.reduce((sum, e) => sum + e.score, 0)} pts au total
          </span>
        </div>

        {/* Liste vide */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 gap-4">
            <span className="text-4xl">🎮</span>
            <p className="text-[#cac3d9] text-sm font-medium">Aucune partie sur cette période</p>
          </div>
        )}

        {/* Groupes par date */}
        {Object.entries(grouped).map(([dateLabel, games]) => (
          <div key={dateLabel} className="space-y-2">
            <p className="text-[#938ea2] text-[11px] font-bold uppercase tracking-widest capitalize">{dateLabel}</p>
            {games.map((g) => {
              const isFinished = g.status === 'finished'
              const time = new Date(g.createdAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Link
                  key={g.gameId}
                  href={isFinished ? `/results/${g.code}` : `/lobby/${g.code}`}
                  className="block bg-[#1e1e2c] rounded-xl p-4 hover:bg-[#292937] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black font-headline ${
                        g.mode === 'bluff'
                          ? 'bg-[#6c3ff5]/20 text-[#e7deff]'
                          : 'bg-[#b83900]/20 text-[#ffb59d]'
                      }`}>
                        {g.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#e3e0f4] text-base font-mono tracking-wider">{g.code}</span>
                        <span className="text-xs text-[#cac3d9]">{time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#007551]/30 text-[#45dfa4] px-3 py-1 rounded-full text-xs font-bold">
                        +{g.score} pts
                      </div>
                      {isFinished ? (
                        <span className="text-[10px] text-[#45dfa4] font-bold">Terminée</span>
                      ) : (
                        <span className="text-[10px] text-[#ffb59d] font-bold">En cours</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </main>
    </div>
  )
}

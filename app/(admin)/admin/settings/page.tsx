'use client'

import { useState } from 'react'
import { Settings, Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [maxPlayers, setMaxPlayers] = useState(7)
  const [maxQuestions, setMaxQuestions] = useState(50)
  const [maintenance, setMaintenance] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    // TODO: persist settings to Supabase or env
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-[#6c3ff5]" />
        <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">Paramètres</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* AI Model */}
        <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-6 space-y-4">
          <h2 className="font-bold text-[#e3e0f4] font-headline">Modèle IA</h2>
          <div>
            <label className="block text-xs text-[#938ea2] mb-1.5">Modèle utilisé pour la génération</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full bg-[#292937] border border-[#484456]/40 rounded-xl px-4 py-2.5 text-sm text-[#e3e0f4] focus:outline-none focus:border-[#6c3ff5]/60"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            </select>
          </div>
        </div>

        {/* Game Limits */}
        <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-6 space-y-4">
          <h2 className="font-bold text-[#e3e0f4] font-headline">Limites de jeu</h2>

          <div>
            <label className="block text-xs text-[#938ea2] mb-1.5">
              Joueurs max par partie
            </label>
            <input
              type="number"
              min={2}
              max={20}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full bg-[#292937] border border-[#484456]/40 rounded-xl px-4 py-2.5 text-sm text-[#e3e0f4] focus:outline-none focus:border-[#6c3ff5]/60"
            />
          </div>

          <div>
            <label className="block text-xs text-[#938ea2] mb-1.5">
              Questions max par partie
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(Number(e.target.value))}
              className="w-full bg-[#292937] border border-[#484456]/40 rounded-xl px-4 py-2.5 text-sm text-[#e3e0f4] focus:outline-none focus:border-[#6c3ff5]/60"
            />
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] p-6 space-y-4">
          <h2 className="font-bold text-[#e3e0f4] font-headline">Maintenance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#e3e0f4]">Mode maintenance</p>
              <p className="text-xs text-[#938ea2]">
                Bloque l&apos;accès aux joueurs pendant les mises à jour
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMaintenance(!maintenance)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                maintenance ? 'bg-[#6c3ff5]' : 'bg-[#484456]/50'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  maintenance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="flex items-center gap-2 bg-[#6c3ff5] hover:bg-[#5a32d4] text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          <Save size={16} />
          {saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
        </button>
      </form>
    </div>
  )
}

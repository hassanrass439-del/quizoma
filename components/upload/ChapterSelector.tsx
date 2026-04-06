'use client'

import { Checkbox } from '@/components/ui/checkbox'
import type { Chapter } from '@/types/ai.types'

interface Props {
  chapters: Chapter[]
  selectedChapters: string[]
  onSelectionChange: (selected: string[]) => void
}

export function ChapterSelector({ chapters, selectedChapters, onSelectionChange }: Props) {
  function toggleChapter(title: string) {
    if (selectedChapters.includes(title)) {
      onSelectionChange(selectedChapters.filter((t) => t !== title))
    } else {
      // Beta gratuit : 1 axe max
      onSelectionChange([title])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text font-bold text-sm">Axes détectés dans ton cours</h3>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {chapters.map((chapter) => (
          <label
            key={chapter.title}
            className="flex items-center gap-3 bg-surface-2 border border-game-border rounded-xl px-4 py-3 cursor-pointer hover:bg-surface-3 transition-colors min-touch"
          >
            <Checkbox
              checked={selectedChapters.includes(chapter.title)}
              onCheckedChange={() => toggleChapter(chapter.title)}
              className="border-game-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <span className="text-text text-sm font-medium flex-1 truncate">
              {chapter.title}
            </span>
          </label>
        ))}
      </div>

      <p className="text-muted-game text-xs">
        {selectedChapters.length} axe sélectionné — 1 axe max en version gratuite
      </p>
    </div>
  )
}

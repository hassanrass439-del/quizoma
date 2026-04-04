'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { Chapter } from '@/types/ai.types'

interface Props {
  chapters: Chapter[]
  selectedChapters: string[]
  onSelectionChange: (selected: string[]) => void
}

export function ChapterSelector({ chapters, selectedChapters, onSelectionChange }: Props) {
  function toggleAll() {
    if (selectedChapters.length === chapters.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(chapters.map((c) => c.title))
    }
  }

  function toggleChapter(title: string) {
    if (selectedChapters.includes(title)) {
      onSelectionChange(selectedChapters.filter((t) => t !== title))
    } else {
      onSelectionChange([...selectedChapters, title])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-text font-bold text-sm">Chapitres détectés</h3>
        <Button
          variant="ghost"
          onClick={toggleAll}
          className="text-primary-light text-sm font-semibold h-auto py-1 px-2 hover:bg-primary/10"
        >
          {selectedChapters.length === chapters.length ? 'Tout désélectionner' : 'Tout sélectionner'}
        </Button>
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
        {selectedChapters.length} chapitre{selectedChapters.length > 1 ? 's' : ''} sélectionné{selectedChapters.length > 1 ? 's' : ''}
      </p>
    </div>
  )
}

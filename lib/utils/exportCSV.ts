import type { Question } from '@/types/game.types'

/**
 * Exporte les questions comme flashcards CSV (compatible Anki & Quizlet).
 * Séparateur point-virgule, encodage UTF-8.
 */
export function exportFlashcardsCSV(questions: Question[]) {
  const header = 'Question;Réponse;Explication\n'
  const rows = questions
    .map(
      (q) =>
        `"${q.question_text.replace(/"/g, '""')}";"${q.vraie_reponse.replace(/"/g, '""')}";"${(q.explication ?? '').replace(/"/g, '""')}"`
    )
    .join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `quizoma-flashcards-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

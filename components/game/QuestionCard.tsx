interface Props {
  questionText: string
  questionIndex: number
  totalQuestions: number
}

export function QuestionCard({ questionText, questionIndex, totalQuestions }: Props) {
  // Remplace ____ par un span stylisé
  const parts = questionText.split('____')

  return (
    <div className="bg-surface-2 rounded-card border border-game-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-game uppercase tracking-wider">
          Question {questionIndex + 1}/{totalQuestions}
        </span>
      </div>
      <p className="text-text text-xl font-bold leading-relaxed text-center">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="inline-block min-w-[80px] border-b-2 border-primary mx-1 text-primary">
                ____
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  )
}

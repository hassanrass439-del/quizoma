interface Props {
  questionText: string
  questionIndex: number
  totalQuestions: number
  mode?: 1 | 2
}

export function QuestionCard({ questionText, questionIndex, totalQuestions, mode = 1 }: Props) {
  if (mode === 2) {
    // Mode QCM : sépare l'énoncé (cas clinique + question) des propositions A–E
    const lines = questionText.split('\n').map((l) => l.trim()).filter(Boolean)
    const propRegex = /^([A-E])[.)]\s*(.*)/i

    const stemLines: string[] = []
    const propositions: { letter: string; text: string }[] = []

    for (const line of lines) {
      const match = propRegex.exec(line)
      if (match) {
        propositions.push({ letter: match[1].toUpperCase(), text: match[2] })
      } else if (propositions.length === 0) {
        stemLines.push(line)
      }
    }

    return (
      <div className="w-full max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
        <div className="space-y-4">
          {/* Énoncé complet (cas clinique + question) */}
          <div className="space-y-2">
            {stemLines.map((line, i) => (
              <p key={i} className="text-[#e3e0f4] text-sm leading-relaxed text-left">
                {line}
              </p>
            ))}
          </div>

          {/* Séparateur */}
          {propositions.length > 0 && (
            <div className="h-px bg-[#484456]/40" />
          )}

          {/* Propositions */}
          {propositions.length > 0 && (
            <div className="space-y-2.5">
              {propositions.map(({ letter, text }) => (
                <div key={letter} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#6c3ff5]/20 border border-[#6c3ff5]/40 flex items-center justify-center text-[#cbbeff] font-black text-xs">
                    {letter}
                  </span>
                  <span className="text-[#e3e0f4] text-sm leading-relaxed pt-0.5">{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mode bluff : phrase à trous
  const parts = questionText.split('____')

  return (
    <div className="w-full">
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

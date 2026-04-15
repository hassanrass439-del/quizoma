import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'

export default async function AdminQuizzesPage() {
  const supabase = await createClient()

  const { data: quizzes } = await supabase
    .from('quiz_library')
    .select('id, title, mode, total_questions, play_count, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen size={24} className="text-[#6c3ff5]" />
        <h1 className="text-2xl font-black text-[#e3e0f4] font-headline">
          Quiz Library ({quizzes?.length ?? 0})
        </h1>
      </div>

      <div className="bg-[#1e1e2c] border border-[#484456]/30 rounded-[18px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-[#938ea2] uppercase tracking-wider border-b border-[#484456]/20">
              <th className="text-left px-6 py-3">Titre</th>
              <th className="text-left px-6 py-3">Mode</th>
              <th className="text-left px-6 py-3">Questions</th>
              <th className="text-left px-6 py-3">Parties jouées</th>
              <th className="text-left px-6 py-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {(quizzes ?? []).map((quiz) => (
              <tr key={quiz.id} className="border-b border-[#484456]/10 hover:bg-[#292937]/50 transition-colors">
                <td className="px-6 py-3 font-bold text-sm text-[#e3e0f4] max-w-[300px] truncate">
                  {quiz.title}
                </td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    quiz.mode === 'bluff' ? 'bg-[#6c3ff5]/20 text-[#cbbeff]' : 'bg-[#b83900]/20 text-[#ffb59d]'
                  }`}>
                    {quiz.mode === 'bluff' ? 'BLUFF' : 'QCM'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-[#cac3d9] font-bold">
                  {quiz.total_questions}
                </td>
                <td className="px-6 py-3 text-sm text-[#cbbeff] font-bold">
                  {quiz.play_count}
                </td>
                <td className="px-6 py-3 text-xs text-[#938ea2]">
                  {new Date(quiz.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {(quizzes ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#938ea2] text-sm">
                  Aucun quiz trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

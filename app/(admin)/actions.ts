'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if ((profile as unknown as { role?: string })?.role !== 'admin') throw new Error('Accès refusé')
  return { user, supabase }
}

async function logAdminAction(adminId: string, action: string, targetType: string, targetId: string, details: object) {
  const admin = createServiceClient()
  await admin.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  })
}

export async function banUser(userId: string, reason: string, durationDays: number | null) {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  const bannedUntil = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null

  await admin.from('profiles').update({
    status: 'banned',
    ban_reason: reason,
    banned_until: bannedUntil,
  }).eq('id', userId)

  await logAdminAction(user.id, 'ban_user', 'user', userId, { reason, durationDays })
  revalidatePath('/admin/users')
}

export async function unbanUser(userId: string) {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  await admin.from('profiles').update({ status: 'active', ban_reason: null, banned_until: null }).eq('id', userId)
  await logAdminAction(user.id, 'unban_user', 'user', userId, {})
  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin') {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  await admin.from('profiles').update({ role }).eq('id', userId)
  await logAdminAction(user.id, 'update_role', 'user', userId, { role })
  revalidatePath('/admin/users')
}

export async function deleteQuiz(quizId: string) {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  await admin.from('quiz_library').delete().eq('id', quizId)
  await logAdminAction(user.id, 'delete_quiz', 'quiz', quizId, {})
  revalidatePath('/admin/quizzes')
}

export async function forceEndGame(gameId: string) {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  await admin.from('games').update({ status: 'finished' }).eq('id', gameId)
  await logAdminAction(user.id, 'force_end_game', 'game', gameId, {})
  revalidatePath('/admin/games')
}

export async function updateSettings(settings: Record<string, string>) {
  const { user } = await requireAdmin()
  const admin = createServiceClient()
  for (const [key, value] of Object.entries(settings)) {
    await admin.from('admin_settings').upsert({ key, value, updated_by: user.id })
  }
  await logAdminAction(user.id, 'update_settings', 'setting', 'bulk', settings)
  revalidatePath('/admin/settings')
}

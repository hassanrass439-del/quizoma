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

  const role = (profile as Record<string, unknown>)?.role
  if (role !== 'admin') throw new Error('Accès refusé')
  return { user, supabase }
}

function getAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServiceClient() as any
}

function logAction(adminId: string, action: string, target: string, details: object) {
  console.log(`[admin] ${action} by ${adminId} on ${target}`, details)
}

export async function banUser(userId: string, reason: string, durationDays: number | null) {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  const bannedUntil = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null
  await admin.from('profiles').update({ status: 'banned', ban_reason: reason, banned_until: bannedUntil }).eq('id', userId)
  logAction(user.id, 'ban_user', userId, { reason, durationDays })
  revalidatePath('/admin/users')
}

export async function unbanUser(userId: string) {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  await admin.from('profiles').update({ status: 'active', ban_reason: null, banned_until: null }).eq('id', userId)
  logAction(user.id, 'unban_user', userId, {})
  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin') {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  await admin.from('profiles').update({ role }).eq('id', userId)
  logAction(user.id, 'update_role', userId, { role })
  revalidatePath('/admin/users')
}

export async function deleteQuiz(quizId: string) {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  await admin.from('quiz_library').delete().eq('id', quizId)
  logAction(user.id, 'delete_quiz', quizId, {})
  revalidatePath('/admin/quizzes')
}

export async function forceEndGame(gameId: string) {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  await admin.from('games').update({ status: 'finished' }).eq('id', gameId)
  logAction(user.id, 'force_end_game', gameId, {})
  revalidatePath('/admin/games')
}

export async function updateSettings(settings: Record<string, string>) {
  const { user } = await requireAdmin()
  const admin = getAdmin()
  for (const [key, value] of Object.entries(settings)) {
    await admin.from('admin_settings').upsert({ key, value, updated_by: user.id })
  }
  logAction(user.id, 'update_settings', 'bulk', settings)
  revalidatePath('/admin/settings')
}

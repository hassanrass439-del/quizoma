export interface AvatarDef {
  id: string
  name: string
  seed: string
  bg: string
  gender: 'f' | 'm'
  accessories?: string
  hairColor?: string
}

// DiceBear avataaars — génère de vrais personnages humains style cartoon
// URL: https://api.dicebear.com/9.x/avataaars/svg?seed=SEED&backgroundColor=BG
export const AVATARS_F: AvatarDef[] = [
  { id: 'f_1', name: 'Dr. Sofia',   seed: 'Sofia',   bg: 'b6e3f4', gender: 'f' },
  { id: 'f_2', name: 'Dr. Léa',     seed: 'Lea',     bg: 'c0aede', gender: 'f' },
  { id: 'f_3', name: 'Dr. Amina',   seed: 'Amina',   bg: 'ffd5dc', gender: 'f' },
  { id: 'f_4', name: 'Emma',        seed: 'Emma',    bg: 'd1f4d1', gender: 'f' },
  { id: 'f_5', name: 'Yasmine',     seed: 'Yasmine', bg: 'ffecd2', gender: 'f' },
  { id: 'f_6', name: 'Marie',       seed: 'Marie',   bg: 'ffd6e0', gender: 'f' },
  { id: 'f_7', name: 'Dr. Chloé',   seed: 'Chloe',   bg: 'd4f1f9', gender: 'f' },
  { id: 'f_8', name: 'Pr. Dubois',  seed: 'Dubois',  bg: 'e8f4d9', gender: 'f' },
  { id: 'f_9', name: 'Sarah',       seed: 'Sarah',   bg: 'fce4ec', gender: 'f' },
  { id: 'f_10', name: 'Jade',       seed: 'Jade',    bg: 'e3f2fd', gender: 'f' },
]

export const AVATARS_M: AvatarDef[] = [
  { id: 'm_1', name: 'Dr. Lucas',   seed: 'Lucas',   bg: 'b6e3f4', gender: 'm' },
  { id: 'm_2', name: 'Dr. Karim',   seed: 'Karim',   bg: 'c0aede', gender: 'm' },
  { id: 'm_3', name: 'Hugo',        seed: 'Hugo',    bg: 'd1f4d1', gender: 'm' },
  { id: 'm_4', name: 'Thomas',      seed: 'Thomas',  bg: 'ffecd2', gender: 'm' },
  { id: 'm_5', name: 'Dr. Antoine', seed: 'Antoine', bg: 'd4f1f9', gender: 'm' },
  { id: 'm_6', name: 'Paul',        seed: 'Paul',    bg: 'fff9c4', gender: 'm' },
  { id: 'm_7', name: 'Pr. Martin',  seed: 'Martin',  bg: 'e8f4d9', gender: 'm' },
  { id: 'm_8', name: 'Alexis',      seed: 'Alexis',  bg: 'ffd6e0', gender: 'm' },
  { id: 'm_9', name: 'Dr. Youssef', seed: 'Youssef', bg: 'e3f2fd', gender: 'm' },
  { id: 'm_10', name: 'Noa',        seed: 'Noa',     bg: 'f3e5f5', gender: 'm' },
]

export const ALL_AVATARS = [...AVATARS_F, ...AVATARS_M]

export function getAvatar(id: string): AvatarDef {
  return ALL_AVATARS.find((a) => a.id === id) ?? AVATARS_F[0]
}

export function avatarUrl(seed: string, bg: string, size = 128): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=50&size=${size}`
}

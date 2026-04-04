import Image from 'next/image'
import { getAvatar, avatarUrl } from '@/lib/avatars'

interface Props {
  avatarId: string
  size?: number
  className?: string
}

export function AvatarImg({ avatarId, size = 48, className = '' }: Props) {
  const av = getAvatar(avatarId)
  const url = avatarUrl(av.seed, av.bg, size * 2)

  return (
    <Image
      src={url}
      alt={av.name}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      unoptimized
    />
  )
}

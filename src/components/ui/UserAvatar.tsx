/**
 * Avatar do torcedor: usa a foto do jogador vinculado quando houver; senão cai
 * na bolinha colorida com a inicial do nome (mesmo visual dos comentários).
 */
const AVATAR_COLORS = [
  '#3ea6ff', '#f28b82', '#fbbc04', '#34a853',
  '#a142f4', '#ff6d00', '#00acc1', '#e91e63',
]

export function avatarColor(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'sm',
}: {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md'
}) {
  const cls = `yt-avatar yt-avatar--${size}`
  if (avatarUrl) {
    return (
      <span className={cls} style={{ padding: 0, overflow: 'hidden' }}>
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    )
  }
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span className={cls} style={{ background: avatarColor(name || '?') }}>
      {initial}
    </span>
  )
}

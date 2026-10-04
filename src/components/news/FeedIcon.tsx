import type { CSSProperties, ReactNode } from 'react'

export type FeedIconName = 'home' | 'heart' | 'bookmark' | 'send' | 'grid' | 'game' | 'arrow' | 'check' | 'article'

const paths: Record<FeedIconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1Z" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  bookmark: <path d="M5 3h14v18l-7-4-7 4Z" />,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  game: <><path d="M7 7h10c3 0 5 9 4 11s-4 0-6-2H9c-2 2-5 4-6 2S4 7 7 7Z" /><path d="M7 10v5m-2.5-2.5h5M16 11h.01M18 14h.01" /></>,
  arrow: <><path d="M19 12H5m6-6-6 6 6 6" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>,
  article: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
}

export default function FeedIcon({ name, filled = false, style }: { name: FeedIconName; filled?: boolean; style?: CSSProperties }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}

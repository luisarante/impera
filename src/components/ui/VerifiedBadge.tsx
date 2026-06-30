/**
 * Selo de verificado sutil em verde (#009640) — estilo portal de notícias.
 */
export default function VerifiedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.62rem] font-medium uppercase tracking-[0.16em]"
      style={{ color: 'var(--color-accent)' }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2l2.4 1.8 3 .1 1 2.8 2.3 1.9-1 2.8 1 2.8-2.3 1.9-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3.3 15.4l1-2.8-1-2.8 2.3-1.9 1-2.8 3-.1L12 2z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M8.5 12.2l2.4 2.3 4.6-4.8" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      SilviaNews
    </span>
  )
}

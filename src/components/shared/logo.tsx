'use client'

/** Logo mark ZEN — gunting bergaya modern dalam kotak vermillion */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Logo ZEN Pangkas Rambut"
    >
      <rect width="64" height="64" rx="18" fill="#E24C3B" />
      <g
        stroke="#FFF7F3"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(15.5, 15.5) scale(1.375)"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </g>
    </svg>
  )
}

/** Wordmark vertikal: ZEN besar + PANGKAS RAMBUT kecil di bawah */
export function LogoWordmark({ size = 56 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <LogoMark size={size} />
      <div className="text-center">
        <div
          className="font-extrabold tracking-[0.22em] text-foreground"
          style={{ fontSize: size * 0.52 }}
        >
          ZEN
        </div>
        <div
          className="mt-1 font-semibold uppercase tracking-[0.35em] text-ink-soft"
          style={{ fontSize: size * 0.18 }}
        >
          Pangkas Rambut
        </div>
      </div>
    </div>
  )
}

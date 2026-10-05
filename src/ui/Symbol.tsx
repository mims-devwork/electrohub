import type { CatalogComponent } from '../content/types'

/** Schematic symbols: the "language" circuits are drawn in. */
export function SchematicSymbol({ symbol, className = '' }: { symbol: CatalogComponent['symbol']; className?: string }) {
  const s = { stroke: 'currentColor', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const body = (() => {
    switch (symbol) {
      case 'battery':
        return (
          <>
            <path d="M5 30 H52 M68 30 H115" {...s} />
            <path d="M52 14 V46 M60 22 V38 M68 14 V46 M76 22 V38" {...s} transform="translate(-4 0)" />
            <text x="40" y="12" fill="currentColor" fontSize="12" fontWeight="700">
              +
            </text>
          </>
        )
      case 'resistor':
        return <path d="M5 30 H30 L35 18 L45 42 L55 18 L65 42 L75 18 L85 42 L90 30 H115" {...s} />
      case 'potentiometer':
        return (
          <>
            <path d="M5 24 H30 L35 12 L45 36 L55 12 L65 36 L75 12 L85 36 L90 24 H115" {...s} />
            <path d="M60 58 V40" {...s} />
            <path d="M53 47 L60 39 L67 47" {...s} strokeWidth={2} />
          </>
        )
      case 'mcu':
        return (
          <>
            <rect x="34" y="6" width="52" height="48" rx="3" {...s} strokeWidth={2} />
            <path d="M14 16 H34 M14 30 H34 M14 44 H34 M86 16 H106 M86 30 H106 M86 44 H106" {...s} strokeWidth={2} />
            <text x="60" y="35" fill="currentColor" fontSize="11" fontFamily="monospace" textAnchor="middle">
              MCU
            </text>
          </>
        )
      case 'led':
      case 'diode':
        return (
          <>
            <path d="M5 30 H45 M75 30 H115 M45 16 V44 L75 30 Z M75 16 V44" {...s} />
            {symbol === 'led' && <path d="M62 12 L72 2 M70 2 H72 V4 M72 14 L82 4 M80 4 H82 V6" {...s} strokeWidth={2} />}
          </>
        )
      case 'capacitor':
        return (
          <>
            <path d="M5 30 H54 M66 30 H115 M54 14 V46" {...s} />
            <path d="M70 14 Q 62 30 70 46" {...s} />
            <text x="40" y="16" fill="currentColor" fontSize="12" fontWeight="700">
              +
            </text>
          </>
        )
      case 'switch':
        return <path d="M5 30 H40 M80 30 H115 M40 30 L76 14" {...s} />
      case 'button':
        return <path d="M5 40 H40 M80 40 H115 M38 28 H82 M60 28 V12 M52 12 H68" {...s} />
      case 'npn':
        return (
          <>
            <circle cx="65" cy="30" r="24" {...s} strokeWidth={2} />
            <path d="M5 30 H55 M55 16 V44 M55 24 L80 8 M55 36 L80 52 M80 8 V2 M80 52 V58" {...s} />
            <path d="M72 46 L80 52 L70 52" {...s} strokeWidth={2} />
          </>
        )
      case 'mosfet':
        return (
          <>
            <path d="M5 40 H45 M45 18 V42 M52 14 V22 M52 26 V34 M52 38 V46 M52 18 H80 V2 M52 42 H80 V58 M52 30 H80 V42" {...s} />
            <path d="M58 30 L66 26 V34 Z" fill="currentColor" />
          </>
        )
      case 'relay':
        return (
          <>
            <rect x="12" y="18" width="30" height="24" {...s} strokeWidth={2} />
            <path d="M18 18 L36 42" {...s} strokeWidth={2} />
            <path d="M42 30 H58" {...s} strokeDasharray="3 4" strokeWidth={2} />
            <path d="M62 44 H75 L100 30 M100 44 H115" {...s} />
          </>
        )
      case 'connector':
        return (
          <>
            <rect x="40" y="10" width="30" height="40" {...s} strokeWidth={2} />
            <path d="M5 22 H40 M5 38 H40" {...s} />
            <circle cx="55" cy="22" r="4" fill="currentColor" />
            <circle cx="55" cy="38" r="4" fill="currentColor" />
          </>
        )
      case 'fuse':
        return (
          <>
            <rect x="30" y="20" width="60" height="20" {...s} strokeWidth={2} />
            <path d="M5 30 H115" {...s} />
          </>
        )
      case 'regulator':
        return (
          <>
            <rect x="35" y="12" width="50" height="30" {...s} strokeWidth={2} />
            <path d="M5 26 H35 M85 26 H115 M60 42 V56" {...s} />
            <text x="44" y="31" fill="currentColor" fontSize="10" fontFamily="monospace">
              IN OUT
            </text>
          </>
        )
    }
  })()
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      {body}
    </svg>
  )
}

import { LED_SPECS } from '../sim/parts'
import type { Part, PartResult } from '../sim/types'
import { BAND_COLORS, resistorDigits } from '../three/models'

const LEAD = '#b8bec7'

/** SVG drawing of a part in its local frame (centred on 0,0, unrotated). */
export function PartGlyph({ part, result }: { part: Part; result?: PartResult }) {
  switch (part.kind) {
    case 'battery': {
      const v = part.props.voltage ?? 9
      return (
        <g>
          <line x1="-56" x2="-44" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <line x1="44" x2="56" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <rect x="-44" y="-21" width="88" height="42" rx="7" fill="#18181b" stroke="#3f3f46" />
          <rect x="14" y="-21" width="30" height="42" rx="7" fill="#b9802f" />
          <rect x="14" y="-21" width="8" height="42" fill="#b9802f" />
          <text x="-14" y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fbbf24" fontFamily="JetBrains Mono, monospace">
            {v}V
          </text>
          <text x="31" y="6" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0b1120">
            +
          </text>
        </g>
      )
    }
    case 'resistor': {
      const [d1, d2, m] = resistorDigits(part.props.ohms ?? 470)
      const heat = Math.min(1, (result?.power ?? 0) / 0.5)
      return (
        <g>
          <line x1="-52" x2="-32" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <line x1="32" x2="52" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          {heat > 0.3 && <rect x="-40" y="-18" width="80" height="36" rx="16" fill="#ff5a1a" opacity={heat * 0.35} filter="url(#glow)" />}
          <rect x="-34" y="-12" width="68" height="24" rx="11" fill={heat > 0.3 ? '#e7b07a' : '#d8c39b'} stroke="#a08660" />
          {[d1, d2, m].map((b, i) => (
            <rect key={i} x={-22 + i * 11} y="-12" width="6" height="24" fill={BAND_COLORS[Math.max(0, b)]} />
          ))}
          <rect x="17" y="-12" width="6" height="24" fill="#c9a227" />
        </g>
      )
    }
    case 'led': {
      const spec = LED_SPECS[part.props.color ?? 'red']
      const burnt = !!part.props.burnt
      const b = burnt ? 0 : (result?.brightness ?? 0)
      const over = !!result?.overload
      return (
        <g>
          <line x1="-40" x2="-14" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <line x1="14" x2="40" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          {b > 0.02 && <circle r={18 + b * 34 + (over ? 20 : 0)} fill={over ? '#ffffff' : spec.hex} opacity={0.18 + b * 0.35} filter="url(#glow)" />}
          <circle r="17" fill={burnt ? '#2a1d16' : spec.hex} opacity={burnt ? 1 : 0.35 + b * 0.65} stroke={burnt ? '#57534e' : spec.hex} strokeWidth="2" />
          {/* flat edge marks the − side */}
          <line x1="15" x2="15" y1="-9" y2="9" stroke={burnt ? '#57534e' : '#0b1120'} strokeWidth="4" />
          <circle r="6" fill={burnt ? '#111' : over ? '#fff' : b > 0.02 ? '#fff' : '#0b1120'} opacity={burnt ? 1 : 0.35 + b * 0.65} />
          {burnt && (
            <g>
              <path d="M -8 -10 L -2 -2 L -7 3 L 2 10" stroke="#a8a29e" strokeWidth="1.5" fill="none" />
              {[0, 1, 2].map((i) => (
                <circle key={i} className="smoke-puff" cx={-6 + i * 6} cy={-20} r="6" fill="#9ca3af" style={{ animationDelay: `${i * 0.7}s` }} />
              ))}
            </g>
          )}
        </g>
      )
    }
    case 'switch': {
      const closed = !!part.props.closed
      return (
        <g>
          <line x1="-46" x2="-24" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <line x1="24" x2="46" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <rect x="-34" y="-8" width="68" height="20" rx="5" fill="#1e293b" stroke="#334155" />
          <circle cx="-24" cy="0" r="5" fill="#c9ced6" />
          <circle cx="24" cy="0" r="5" fill="#c9ced6" />
          <line x1="-24" y1="0" x2={closed ? 24 : 16} y2={closed ? 0 : -24} stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" style={{ transition: 'all 0.15s' }} />
          <circle cx={closed ? 24 : 16} cy={closed ? 0 : -24} r="5" fill="#e11d48" style={{ transition: 'all 0.15s' }} />
        </g>
      )
    }
    case 'button': {
      const pressed = !!part.props.closed
      return (
        <g>
          <line x1="-40" x2="-22" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <line x1="22" x2="40" y1="0" y2="0" stroke={LEAD} strokeWidth="4" />
          <rect x="-22" y="-22" width="44" height="44" rx="5" fill="#111827" stroke="#374151" />
          <rect x="-19" y="-19" width="38" height="38" rx="4" fill="none" stroke="#9ca3af" strokeOpacity="0.5" />
          <circle data-button-cap r={pressed ? 11 : 13} fill={pressed ? '#9f1239' : '#e11d48'} stroke="#fb7185" strokeOpacity="0.5" style={{ transition: 'r 0.08s' }} />
        </g>
      )
    }
  }
}

/** Approximate half-size of each part for hit areas and selection boxes. */
export const PART_BOUNDS: Record<Part['kind'], { w: number; h: number }> = {
  battery: { w: 96, h: 50 },
  resistor: { w: 76, h: 32 },
  led: { w: 44, h: 44 },
  switch: { w: 76, h: 56 },
  button: { w: 50, h: 50 },
}

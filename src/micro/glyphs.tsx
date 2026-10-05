import { PartGlyph } from '../circuit/PartGlyph'
import { BOARD_PINS, pinPosition } from './board'
import type { BoardPin } from './types'

const LEAD = '#b8bec7'

/** Knob angle: −135° (fully one way) to +135° (fully the other). */
export const knobAngle = (pos: number) => -135 + pos * 270

/** A breadboard potentiometer, centred on 0,0, legs on the left. */
export function PotGlyph({ pos, glow = 0 }: { pos: number; glow?: number }) {
  const a = (knobAngle(pos) * Math.PI) / 180
  const arc = (from: number, to: number, r: number) => {
    const p = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180
      return `${(Math.cos(rad) * r).toFixed(2)} ${(Math.sin(rad) * r).toFixed(2)}`
    }
    return `M ${p(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`
  }
  return (
    <g>
      {[-26, 0, 26].map((y) => (
        <line key={y} x1="-64" x2="-36" y1={y} y2={y} stroke={LEAD} strokeWidth="4" />
      ))}
      <rect x="-38" y="-38" width="76" height="76" rx="10" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="2" />
      {/* the resistor track and how far the wiper has travelled along it */}
      <path d={arc(-135, 135, 31)} stroke="#0b1120" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
      {pos > 0.005 && <path d={arc(-135, knobAngle(pos), 31)} stroke="#fbbf24" strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.35 + glow * 0.65} />}
      <circle data-knob r="23" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" style={{ cursor: 'grab' }} />
      <circle data-knob r="17" fill="#f8fafc" stroke="#cbd5e1" />
      <line data-knob x1="0" y1="0" x2={Math.sin(a) * 19} y2={-Math.cos(a) * 19} stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

/** An LED with its own 220 Ω resistor on a little carrier board. Both connections are on the left. */
export function LedModuleGlyph({ brightness, current }: { brightness: number; current: number }) {
  return (
    <g>
      <rect x="-70" y="-34" width="160" height="68" rx="10" fill="#0f172a" stroke="#283655" strokeDasharray="4 4" />
      {/* + in, through the resistor and the LED, then a return trace back to − */}
      <line x1="-78" x2="-62" y1="-12" y2="-12" stroke={LEAD} strokeWidth="4" />
      <path d="M 74 -12 H 84 V 18 H -78" stroke={LEAD} strokeWidth="3" fill="none" strokeLinejoin="round" />
      <g transform="translate(-33 -12) scale(0.6)">
        <PartGlyph part={{ id: 'm-r', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: 220 } }} />
      </g>
      <g transform="translate(34 -12)">
        <PartGlyph
          part={{ id: 'm-led', kind: 'led', x: 0, y: 0, rot: 0, props: { color: 'red' } }}
          result={{ current, voltage: 0, power: 0, brightness, ledState: brightness > 0 ? 'on' : 'off' }}
        />
      </g>
    </g>
  )
}

/** The development board, drawn in bench coordinates with its header on the right. */
export function BoardGlyph({
  powered = true,
  ledL = false,
  highlight = [],
  onPin,
  activePin,
  readings,
}: {
  powered?: boolean
  ledL?: boolean
  highlight?: BoardPin[]
  onPin?: (pin: BoardPin) => void
  activePin?: BoardPin | null
  readings?: Partial<Record<BoardPin, string>>
}) {
  return (
    <g>
      <rect x="30" y="36" width="342" height="412" rx="16" fill="#0e6e8c" stroke="#0b5468" strokeWidth="3" />
      <rect x="30" y="36" width="342" height="412" rx="16" fill="url(#board-sheen)" />
      {/* mounting holes */}
      {[
        [52, 58],
        [52, 426],
        [170, 58],
        [170, 426],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="#0b1120" stroke="#c9ced6" strokeWidth="2" />
      ))}
      {/* USB socket and power jack */}
      <rect x="14" y="92" width="70" height="56" rx="4" fill="#c9ced6" stroke="#8a94a3" />
      <rect x="22" y="104" width="54" height="32" rx="3" fill="#9aa3b0" />
      <rect x="14" y="330" width="62" height="50" rx="5" fill="#111" stroke="#333" />
      <text x="49" y="168" textAnchor="middle" fontSize="10" fill="#bfe6f2" opacity="0.7">
        USB
      </text>
      {/* the microcontroller chip */}
      <g>
        {Array.from({ length: 10 }, (_, k) => (
          <g key={k}>
            <rect x={130 + k * 13} y="196" width="6" height="10" fill="#c9ced6" />
            <rect x={130 + k * 13} y="276" width="6" height="10" fill="#c9ced6" />
          </g>
        ))}
        <rect x="118" y="204" width="146" height="74" rx="6" fill="#141414" stroke="#2a2a2a" />
        <circle cx="132" cy="218" r="4" fill="#2a2a2a" />
        <text x="191" y="247" textAnchor="middle" fontSize="18" fontWeight="700" fill="#9ca3af" fontFamily="JetBrains Mono, monospace">
          MCU
        </text>
        <text x="191" y="264" textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="JetBrains Mono, monospace">
          16 MHz · 32 KB
        </text>
      </g>
      {/* status LEDs */}
      <g>
        <rect x="236" y="96" width="14" height="9" rx="2" fill={powered ? '#22c55e' : '#14532d'} />
        {powered && <circle cx="243" cy="100" r="12" fill="#22c55e" opacity="0.35" filter="url(#glow)" />}
        <text x="258" y="104" fontSize="10" fill="#d7f2fa">
          ON
        </text>
        <rect x="236" y="120" width="14" height="9" rx="2" fill={powered && ledL ? '#f59e0b' : '#5b3a0a'} />
        {powered && ledL && <circle cx="243" cy="124" r="12" fill="#f59e0b" opacity="0.45" filter="url(#glow)" />}
        <text x="258" y="128" fontSize="10" fill="#d7f2fa">
          L (pin 13)
        </text>
      </g>
      <text x="191" y="404" textAnchor="middle" fontSize="13" fontWeight="700" fill="#d7f2fa" opacity="0.85" letterSpacing="1">
        ElectroHub UNO
      </text>
      {/* header strip */}
      <rect x="342" y="60" width="28" height="372" rx="4" fill="#111" />
      <text x="300" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill="#bfe6f2" letterSpacing="1.5">
        POWER · ANALOG
      </text>
      <text x="300" y="232" textAnchor="middle" fontSize="9" fontWeight="700" fill="#bfe6f2" letterSpacing="1.5">
        DIGITAL
      </text>
      {BOARD_PINS.map((p) => {
        const pos = pinPosition(p.pin)
        const hl = highlight.includes(p.pin)
        const active = activePin === p.pin
        return (
          <g key={p.pin} onClick={onPin ? () => onPin(p.pin) : undefined} style={onPin ? { cursor: 'pointer' } : undefined} role={onPin ? 'button' : undefined} aria-label={onPin ? `Pin ${p.label}` : undefined}>
            {onPin && <rect x="250" y={pos.y - 20} width="124" height="40" fill="transparent" />}
            {(hl || active) && <rect x="252" y={pos.y - 18} width="122" height="36" rx="8" fill={hl ? '#f43f5e' : p.color} opacity={hl ? 0.18 : 0.22} />}
            <rect x="348" y={pos.y - 8} width="16" height="16" rx="2" fill="#d4a62a" />
            <rect x="352" y={pos.y - 4} width="8" height="8" fill="#0b1120" />
            <text x="336" y={pos.y + (readings ? 0 : 4)} textAnchor="end" fontSize="13" fontWeight="800" fill={p.color === '#64748b' ? '#cbd5e1' : p.color} fontFamily="JetBrains Mono, monospace">
              {p.label}
            </text>
            {readings?.[p.pin] && (
              <text x="336" y={pos.y + 13} textAnchor="end" fontSize="10.5" fill="#d7f2fa" opacity="0.85" fontFamily="JetBrains Mono, monospace">
                {readings[p.pin]}
              </text>
            )}
          </g>
        )
      })}
      {!powered && <rect x="30" y="36" width="342" height="412" rx="16" fill="#070b14" opacity="0.35" pointerEvents="none" />}
    </g>
  )
}

/** Shared SVG defs for the board (sheen) and parts (glow, shadow). */
export function BenchDefs() {
  return (
    <defs>
      <pattern id="bench-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="#1f2a44" />
      </pattern>
      <linearGradient id="board-sheen" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
      </linearGradient>
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="8" />
      </filter>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  )
}

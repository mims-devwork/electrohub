import { useEffect, useRef } from 'react'
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

/** Spin a group smoothly at `revsPerSec` (signed), independent of how often React re-renders. */
function useSpin(revsPerSec: number) {
  const ref = useRef<SVGGElement>(null)
  const speed = useRef(revsPerSec)
  speed.current = revsPerSec
  useEffect(() => {
    let angle = 0
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      angle = (angle + speed.current * 360 * Math.min(0.05, (now - last) / 1000)) % 360
      last = now
      ref.current?.setAttribute('transform', `rotate(${angle.toFixed(1)})`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return ref
}

const leads = (ys: number[], from: number, to: number, colors?: string[]) =>
  ys.map((y, i) => <line key={y} x1={from} x2={to} y1={y} y2={y} stroke={colors?.[i] ?? LEAD} strokeWidth="4" />)

/** TMP36 temperature sensor: a small black TO-92 package, flat face left. */
export function TmpGlyph({ hot }: { hot: boolean }) {
  return (
    <g>
      {leads([-26, 0, 26], -48, -16)}
      {hot && <circle cx="4" r="34" fill="#ff5a1a" opacity="0.45" filter="url(#glow)" />}
      <path d="M -16 -30 H 2 A 22 30 0 0 1 2 30 H -16 Z" fill={hot ? '#7c2d12' : '#141414'} stroke="#333" />
      <text x="0" y="4" textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="JetBrains Mono, monospace" transform="rotate(-90 0 0)">
        TMP36
      </text>
    </g>
  )
}

/** Hobby servo seen from above: three coloured wires, a blue case and a white horn. */
export function ServoGlyph({ angle }: { angle: number | null }) {
  const a = angle ?? 90
  return (
    <g>
      {leads([-26, 0, 26], -70, -46, ['#7c4a1e', '#dc2626', '#f97316'])}
      <rect x="-46" y="-34" width="92" height="68" rx="8" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="2" />
      <rect x="-56" y="-8" width="10" height="16" rx="2" fill="#1e3a8a" />
      <rect x="46" y="-8" width="10" height="16" rx="2" fill="#1e3a8a" />
      {/* the angle scale */}
      <path d="M -6 -2 A 26 26 0 0 1 46 -2" fill="none" stroke="#93c5fd" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="2 4" transform="translate(-20 0)" />
      <circle cx="20" cy="0" r="11" fill="#e5e7eb" />
      <g transform={`translate(20 0) rotate(${a - 90})`} style={{ transition: 'transform 0.35s ease-out' }}>
        <rect x="-5" y="-38" width="10" height="42" rx="5" fill="#f8fafc" stroke="#cbd5e1" />
        <circle cy="-30" r="2" fill="#94a3b8" />
      </g>
      <circle cx="20" cy="0" r="4" fill="#94a3b8" />
      {angle === null && (
        <text x="0" y="26" textAnchor="middle" fontSize="9" fill="#bfdbfe">
          waiting
        </text>
      )}
    </g>
  )
}

/** Yellow gear motor with a wheel on its shaft. */
export function MotorGlyph({ spin }: { spin: number }) {
  const wheel = useSpin(spin * 3)
  return (
    <g>
      {leads([-14, 14], -62, -42)}
      <rect x="-42" y="-24" width="62" height="48" rx="8" fill="#eab308" stroke="#a16207" strokeWidth="2" />
      <text x="-11" y="4" textAnchor="middle" fontSize="9" fontWeight="700" fill="#713f12">
        6 V
      </text>
      <rect x="20" y="-5" width="12" height="10" fill="#d4d4d8" />
      <g transform="translate(58 0)">
        <circle r="30" fill="#1f2937" stroke="#111827" strokeWidth="4" />
        <g ref={wheel}>
          {[0, 120, 240].map((r) => (
            <rect key={r} x="-3" y="-25" width="6" height="25" fill="#6b7280" transform={`rotate(${r})`} />
          ))}
          <circle cy="-22" r="4" fill="#fbbf24" />
        </g>
        <circle r="7" fill="#9ca3af" />
      </g>
    </g>
  )
}

/** Slotted encoder disc and the light sensor fork that watches it. */
export function EncoderGlyph({ spin, powered }: { spin: number; powered: boolean }) {
  const disc = useSpin(spin * 3)
  return (
    <g>
      {leads([-26, 0, 26], -54, -30)}
      <rect x="-30" y="-32" width="34" height="64" rx="4" fill="#1e3a8a" />
      <g transform="translate(26 0)">
        <circle r="26" fill="#111827" stroke="#374151" />
        <g ref={disc}>
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x="-1.5" y="-24" width="3" height="8" fill="#0b1120" transform={`rotate(${i * 18})`} />
          ))}
        </g>
        <circle r="5" fill="#6b7280" />
      </g>
      <rect x="-6" y="-30" width="14" height="14" rx="2" fill="#0f172a" stroke="#475569" />
      <circle cx="1" cy="-23" r="3" fill={powered ? '#f43f5e' : '#3f1d2b'} />
    </g>
  )
}

/** H-bridge motor driver board. */
export function DriverGlyph({ enable, dir, ok }: { enable: number; dir: 0 | 1; ok: boolean }) {
  return (
    <g>
      {leads([-42, -14, 14, 42], -76, -60)}
      {leads([-16, 16], 60, 76)}
      <rect x="-60" y="-58" width="120" height="116" rx="8" fill="#7f1d1d" stroke="#450a0a" strokeWidth="2" />
      <rect x="-22" y="-18" width="44" height="36" rx="3" fill="#141414" />
      <text x="0" y="3" textAnchor="middle" fontSize="8" fontWeight="700" fill="#9ca3af" fontFamily="JetBrains Mono, monospace">
        H-BRIDGE
      </text>
      <text x="0" y="-36" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fecaca" letterSpacing="1">
        MOTOR DRIVER
      </text>
      <circle cx="-30" cy="38" r="4" fill={ok && enable > 0 ? '#22c55e' : '#14532d'} />
      <text x="-22" y="41" fontSize="8" fill="#fecaca">
        EN
      </text>
      {ok && enable > 0 && (
        <text x="22" y="42" textAnchor="middle" fontSize="13" fill="#fde68a">
          {dir ? '↺' : '↻'}
        </text>
      )}
    </g>
  )
}

/** A holder with four AA cells. */
export function BatteryPackGlyph({ volts }: { volts: number }) {
  return (
    <g>
      <line x1="-82" x2="-64" y1="-12" y2="-12" stroke="#dc2626" strokeWidth="4" />
      <line x1="-82" x2="-64" y1="12" y2="12" stroke="#1f2937" strokeWidth="4" />
      <rect x="-64" y="-30" width="132" height="60" rx="6" fill="#111827" stroke="#374151" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${-58 + i * 31} -24)`}>
          <rect width="27" height="48" rx="4" fill="#b9802f" />
          <rect y="16" width="27" height="32" rx="4" fill="#18181b" />
          <text x="13.5" y="11" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0b1120">
            {i % 2 ? '−' : '+'}
          </text>
        </g>
      ))}
      <text x="2" y="44" textAnchor="middle" fontSize="10" fill="#8a9bb8" fontFamily="JetBrains Mono, monospace">
        4 × AA · {volts} V
      </text>
    </g>
  )
}

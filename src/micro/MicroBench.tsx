import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { PartGlyph } from '../circuit/PartGlyph'
import { formatAmps, formatOhms } from '../sim/parts'
import { BENCH_H, BENCH_W, BOARD, BOARD_PINS, MICRO_PART_DEFS, PIN_BY_ID, boardRef, microTerminalPosition, parseMicroRef, pinPosition, refPosition } from './board'
import { BenchDefs, BoardGlyph, LedModuleGlyph, PotGlyph } from './glyphs'
import type { BoardPin, MicroPart, MicroPartKind, MicroRef } from './types'
import type { MicroApi } from './useMicro'

const SNAP = 10
const TERMINAL_HIT = 30

/** Rough half-size of each part, for hit areas and selection boxes. */
const BOUNDS: Record<MicroPartKind, { x: number; y: number; w: number; h: number }> = {
  pot: { x: -40, y: -40, w: 80, h: 80 },
  button: { x: -25, y: -25, w: 50, h: 50 },
  led: { x: -70, y: -34, w: 160, h: 68 },
  resistor: { x: -38, y: -16, w: 76, h: 32 },
}

type Drag =
  | { kind: 'part'; id: string; ox: number; oy: number; sx: number; sy: number; moved: boolean }
  | { kind: 'wire'; from: MicroRef; sx: number; sy: number; moved: boolean }
  | { kind: 'knob'; id: string }
  | { kind: 'button'; id: string }

const snap = (v: number) => Math.round(v / SNAP) * SNAP

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const sag = Math.min(60, dist * 0.18)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 + sag
  return { d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, mid: { x: mx, y: (a.y + b.y) / 2 + sag / 2 } }
}

const WIRE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316', '#14b8a6']

function wireColor(from: MicroRef, to: MicroRef, index: number) {
  const pins = [from, to].map(parseMicroRef).filter((e) => e.partId === 'board').map((e) => e.terminal as BoardPin)
  if (pins.includes('5V')) return '#ef4444'
  if (pins.includes('GND') || pins.includes('GND2')) return '#475569'
  if (pins.length) return PIN_BY_ID[pins[0]].color
  return WIRE_COLORS[index % WIRE_COLORS.length]
}

export function formatPinReading(api: MicroApi, pin: BoardPin): string {
  const { frame, program, slots } = api
  const { sol } = frame
  if (!sol.powered) return pin === '5V' ? 'off' : ''
  if (pin === '5V') return '5.00 V'
  if (pin === 'GND' || pin === 'GND2') return '0 V'
  const out = frame.outputs[pin]
  if (out !== undefined) return out > 0 && out < 1 ? `PWM ${Math.round(out * 100)}%` : out ? 'OUT HIGH' : 'OUT LOW'
  if (program.outputs(slots).includes(pin) && api.uploading) return 'uploading…'
  // Say nothing about pins the program ignores and nobody has wired up.
  const used = program.reads.includes(pin) || api.circuit.wires.some((w) => w.from === boardRef(pin) || w.to === boardRef(pin))
  if (!used) return ''
  if (sol.pinFloating[pin]) return 'floating'
  return `${sol.pinVolts[pin].toFixed(2)} V`
}

export function MicroBench({
  api,
  selectedId,
  onSelect,
  highlight = [],
  showReadings = true,
}: {
  api: MicroApi
  selectedId: string | null
  onSelect: (id: string | null) => void
  highlight?: string[]
  showReadings?: boolean
}) {
  const { circuit, frame, inputs } = api
  const { sol } = frame
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [pendingFrom, setPendingFrom] = useState<MicroRef | null>(null)
  const [hoverTerm, setHoverTerm] = useState<MicroRef | null>(null)
  const [selectedWire, setSelectedWire] = useState<string | null>(null)

  const partById = useMemo(() => new Map(circuit.parts.map((p) => [p.id, p])), [circuit.parts])
  const posOf = (ref: MicroRef) => refPosition(circuit.parts, ref)

  const allTerminals = useMemo(() => {
    const list: { ref: MicroRef; x: number; y: number; color: string; label: string; hint: string }[] = BOARD_PINS.map((p) => ({
      ref: boardRef(p.pin),
      ...pinPosition(p.pin),
      color: p.color === '#64748b' ? '#94a3b8' : p.color,
      label: '',
      hint: p.hint,
    }))
    for (const part of circuit.parts) {
      for (const t of MICRO_PART_DEFS[part.kind].terminals) {
        const color = t.name === 'anode' ? '#fbbf24' : t.name === 'cathode' ? '#38bdf8' : t.name === 'w' ? '#a78bfa' : '#cbd5e1'
        list.push({ ref: `${part.id}:${t.name}`, ...microTerminalPosition(part, t.name), color, label: t.label, hint: t.hint })
      }
    }
    return list
  }, [circuit.parts])

  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }

  const nearestTerminal = (x: number, y: number, exclude?: MicroRef) => {
    let best: MicroRef | null = null
    let bestD = TERMINAL_HIT
    for (const t of allTerminals) {
      if (t.ref === exclude) continue
      const d = Math.hypot(t.x - x, t.y - y)
      if (d < bestD) {
        bestD = d
        best = t.ref
      }
    }
    return best
  }

  // Release a held button even if the pointer leaves the bench.
  useEffect(() => {
    if (drag?.kind !== 'button') return
    const up = () => {
      api.setPressed(drag.id, false)
      setDrag(null)
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [drag, api])

  const knobTo = (part: MicroPart, p: { x: number; y: number }) => {
    let deg = (Math.atan2(p.x - part.x, -(p.y - part.y)) * 180) / Math.PI
    // The dead zone at the bottom of the knob sticks to the nearer end.
    if (deg > 135) deg = 135
    if (deg < -135) deg = -135
    api.setKnob(part.id, (deg + 135) / 270)
  }

  const onPartDown = (e: ReactPointerEvent, part: MicroPart) => {
    e.stopPropagation()
    setSelectedWire(null)
    const target = e.target as Element
    if (part.kind === 'button' && target.hasAttribute('data-button-cap')) {
      api.setPressed(part.id, true)
      setDrag({ kind: 'button', id: part.id })
      return
    }
    const p = toLocal(e.clientX, e.clientY)
    svgRef.current?.setPointerCapture(e.pointerId)
    if (part.kind === 'pot' && target.hasAttribute('data-knob')) {
      setDrag({ kind: 'knob', id: part.id })
      knobTo(part, p)
      return
    }
    setDrag({ kind: 'part', id: part.id, ox: p.x - part.x, oy: p.y - part.y, sx: p.x, sy: p.y, moved: false })
  }

  const onTerminalDown = (e: ReactPointerEvent, ref: MicroRef) => {
    e.stopPropagation()
    setSelectedWire(null)
    if (pendingFrom && pendingFrom !== ref) {
      api.addWire(pendingFrom, ref)
      setPendingFrom(null)
      return
    }
    const p = toLocal(e.clientX, e.clientY)
    svgRef.current?.setPointerCapture(e.pointerId)
    setPointer(p)
    setDrag({ kind: 'wire', from: ref, sx: p.x, sy: p.y, moved: false })
  }

  const onMove = (e: ReactPointerEvent) => {
    const p = toLocal(e.clientX, e.clientY)
    setPointer(p)
    if (!drag || drag.kind === 'button') return
    if (drag.kind === 'knob') {
      const part = partById.get(drag.id)
      if (part) knobTo(part, p)
      return
    }
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > 5
    if (drag.kind === 'part' && moved) {
      // Keep parts off the board and on the bench.
      const x = Math.min(BENCH_W - 90, Math.max(470, snap(p.x - drag.ox)))
      const y = Math.min(BENCH_H - 40, Math.max(40, snap(p.y - drag.oy)))
      api.movePart(drag.id, x, y)
    }
    if (moved !== drag.moved) setDrag({ ...drag, moved })
  }

  const onUp = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') setHoverTerm(null)
    if (!drag || drag.kind === 'button') return
    if (drag.kind === 'knob') {
      setDrag(null)
      return
    }
    setHoverTerm(null)
    const p = toLocal(e.clientX, e.clientY)
    if (drag.kind === 'wire') {
      const target = nearestTerminal(p.x, p.y, drag.from)
      if (target && drag.moved) api.addWire(drag.from, target)
      else if (!drag.moved) setPendingFrom(drag.from)
    } else if (drag.kind === 'part' && !drag.moved) {
      onSelect(drag.id)
    }
    setDrag(null)
  }

  const onBackgroundDown = () => {
    setPendingFrom(null)
    setSelectedWire(null)
    onSelect(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('application/x-electrohub-micro-part') as MicroPartKind
    if (!kind || !MICRO_PART_DEFS[kind]) return
    const p = toLocal(e.clientX, e.clientY)
    onSelect(api.addPart(kind, Math.min(BENCH_W - 90, Math.max(470, snap(p.x))), Math.min(BENCH_H - 40, Math.max(40, snap(p.y)))))
  }

  const wiringFrom = drag?.kind === 'wire' ? drag.from : pendingFrom
  const connected = new Set(circuit.wires.flatMap((w) => [w.from, w.to]))
  const hl = new Set(highlight)
  const readings = showReadings ? Object.fromEntries(BOARD_PINS.map((p) => [p.pin, formatPinReading(api, p.pin)])) : undefined

  return (
    <div className="relative" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BENCH_W} ${BENCH_H}`}
        className="block w-full select-none rounded-2xl border border-ink-700 bg-ink-900"
        style={{ touchAction: 'none', maxHeight: 'calc(100svh - 250px)', minHeight: 300 }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerDown={onBackgroundDown}
        role="application"
        aria-label="Microcontroller bench. Drag between pins and part legs to connect wires."
      >
        <BenchDefs />
        <rect width={BENCH_W} height={BENCH_H} fill="url(#bench-grid)" />

        <BoardGlyph
          powered={sol.powered}
          ledL={(frame.outputs.D13 ?? 0) >= 0.5}
          highlight={BOARD_PINS.map((p) => p.pin).filter((pin) => hl.has(boardRef(pin)))}
          readings={readings}
        />

        {/* parts */}
        {circuit.parts.map((part) => {
          const b = BOUNDS[part.kind]
          const isSel = selectedId === part.id
          const led = sol.leds[part.id]
          return (
            <g key={part.id} transform={`translate(${part.x} ${part.y})`}>
              {hl.has(part.id) && <rect x={b.x - 14} y={b.y - 14} width={b.w + 28} height={b.h + 28} rx="16" fill="#f43f5e" opacity="0.12" />}
              <g filter="url(#soft)" onPointerDown={(e) => onPartDown(e, part)} style={{ cursor: drag?.kind === 'part' ? 'grabbing' : 'grab' }}>
                <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} fill="transparent" />
                {part.kind === 'pot' && <PotGlyph pos={inputs.knob[part.id] ?? 0.5} glow={sol.powered ? 1 : 0} />}
                {part.kind === 'button' && <PartGlyph part={{ id: part.id, kind: 'button', x: 0, y: 0, rot: 0, props: { closed: !!inputs.pressed[part.id] } }} />}
                {part.kind === 'resistor' && <PartGlyph part={{ id: part.id, kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: part.props.ohms ?? BOARD.trayOhms } }} />}
                {part.kind === 'led' && <LedModuleGlyph brightness={led?.brightness ?? 0} current={led?.current ?? 0} />}
              </g>
              {isSel && (
                <rect x={b.x - 10} y={b.y - 10} width={b.w + 20} height={b.h + 20} rx="12" fill="none" stroke="#fbbf24" strokeDasharray="5 5" pointerEvents="none" />
              )}
              {isSel && !part.locked && (
                <g
                  transform={`translate(${b.x + b.w + 8} ${b.y - 8})`}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    api.deletePart(part.id)
                    onSelect(null)
                  }}
                  role="button"
                  aria-label="Remove part"
                >
                  <circle r="12" fill="#f43f5e" stroke="#0b1120" strokeWidth="2" />
                  <path d="M -4.5 -4.5 L 4.5 4.5 M 4.5 -4.5 L -4.5 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              )}
            </g>
          )
        })}

        {/* wires */}
        {circuit.wires.map((w, i) => {
          const a = posOf(w.from)
          const b = posOf(w.to)
          const { d, mid } = wirePath(a, b)
          const net = sol.netOf[w.from]
          const volts = net !== undefined && !sol.floating[net] && sol.powered ? sol.netVolts[net] : 0
          return (
            <g key={w.id}>
              {hl.has(w.id) && <path d={d} stroke="#f43f5e" strokeWidth="14" fill="none" opacity="0.35" filter="url(#glow)" />}
              <path d={d} stroke="#05080f" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d={d} stroke={wireColor(w.from, w.to, i)} strokeWidth="5.5" fill="none" strokeLinecap="round" />
              {/* a faint glow that brightens with the wire's voltage */}
              <path d={d} stroke="#fde68a" strokeWidth="2" fill="none" strokeLinecap="round" opacity={Math.max(0, Math.min(1, volts / BOARD.volts)) * 0.55} pointerEvents="none" />
              <path
                d={d}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  setSelectedWire(w.id)
                  onSelect(null)
                }}
              />
              {selectedWire === w.id && (
                <g
                  transform={`translate(${mid.x} ${mid.y})`}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    api.removeWire(w.id)
                    setSelectedWire(null)
                  }}
                  role="button"
                  aria-label="Delete wire"
                >
                  <circle r="13" fill="#f43f5e" stroke="#0b1120" strokeWidth="2" />
                  <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              )}
            </g>
          )
        })}

        {wiringFrom && pointer && <path d={wirePath(posOf(wiringFrom), pointer).d} stroke="#fbbf24" strokeWidth="4" strokeDasharray="8 6" fill="none" pointerEvents="none" />}

        {/* terminals */}
        {allTerminals.map((t) => {
          const isConnected = connected.has(t.ref)
          const active = wiringFrom === t.ref
          return (
            <g key={t.ref} transform={`translate(${t.x} ${t.y})`}>
              {hl.has(t.ref) && <circle r="16" fill="#f43f5e" opacity="0.3" />}
              <circle r="20" fill="transparent" style={{ cursor: 'crosshair' }} onPointerDown={(e) => onTerminalDown(e, t.ref)} />
              <circle
                r={hoverTerm === t.ref || active ? 10 : 8}
                fill={isConnected ? t.color : '#0b1120'}
                stroke={t.color}
                strokeWidth="3"
                style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
                onPointerDown={(e) => onTerminalDown(e, t.ref)}
                onPointerEnter={() => setHoverTerm(t.ref)}
                onPointerLeave={() => setHoverTerm((h) => (h === t.ref ? null : h))}
              />
              {t.label && (
                <text x="-14" y="4" textAnchor="end" fontSize="12" fontWeight="800" fill={t.color} pointerEvents="none">
                  {t.label}
                </text>
              )}
            </g>
          )
        })}

        {/* live readings under the parts */}
        {showReadings &&
          circuit.parts.map((part) => {
            const b = BOUNDS[part.kind]
            let text = ''
            if (part.kind === 'pot') {
              const k = sol.netOf[`${part.id}:w`]
              text = `knob ${Math.round((inputs.knob[part.id] ?? 0.5) * 100)}% · wiper ${sol.floating[k] ? 'floating' : `${sol.netVolts[k].toFixed(2)} V`}`
            }
            if (part.kind === 'button') text = inputs.pressed[part.id] ? 'pressed' : 'hold to press'
            if (part.kind === 'resistor') text = formatOhms(part.props.ohms ?? BOARD.trayOhms)
            if (part.kind === 'led') text = `LED + 220 Ω · ${formatAmps(sol.leds[part.id]?.current ?? 0)}`
            return (
              <text key={part.id} x={part.x + b.x + b.w / 2} y={part.y + b.y + b.h + 20} textAnchor="middle" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="#8a9bb8" pointerEvents="none">
                {text}
              </text>
            )
          })}

        {/* terminal tooltip */}
        {hoverTerm &&
          (() => {
            const t = allTerminals.find((x) => x.ref === hoverTerm)
            if (!t) return null
            const k = sol.netOf[hoverTerm]
            const v = k === undefined ? '' : sol.floating[k] ? ' · floating' : ` · ${sol.netVolts[k].toFixed(2)} V`
            const text = `${t.hint}${v}`
            const w = Math.min(470, text.length * 6.3 + 20)
            const x = Math.min(BENCH_W - w - 6, Math.max(6, t.x - w / 2))
            const y = t.y < 70 ? t.y + 20 : t.y - 46
            return (
              <g pointerEvents="none">
                <rect x={x} y={y} width={w} height="26" rx="6" fill="#070b14" stroke="#283655" opacity="0.95" />
                <text x={x + 10} y={y + 17} fontSize="11.5" fill="#cdd7e6">
                  {text}
                </text>
              </g>
            )
          })()}
      </svg>
      {pendingFrom && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-volt px-3 py-1 text-xs font-medium text-ink-950 shadow">
          Now click a pin or another leg to connect · click empty space to cancel
        </div>
      )}
      {!sol.powered && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-danger/50 bg-danger/15 px-3 py-1.5 text-xs font-medium text-rose-200">
          ⚠️ No power: the board’s fuse has cut out
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { PART_DEFS, formatAmps, formatOhms, parseRef, terminalPosition, terminalRef } from '../sim/parts'
import type { Part, PartKind } from '../sim/types'
import { PART_BOUNDS, PartGlyph } from './PartGlyph'
import type { CircuitApi } from './useCircuit'

export const BENCH_W = 860
export const BENCH_H = 520
const SNAP = 10
const TERMINAL_HIT = 30

export type FlowMode = 'electrons' | 'conventional' | 'off'

type Drag =
  | { kind: 'part'; id: string; ox: number; oy: number; sx: number; sy: number; moved: boolean }
  | { kind: 'wire'; from: string; sx: number; sy: number; moved: boolean }
  | { kind: 'button'; id: string }

const snap = (v: number) => Math.round(v / SNAP) * SNAP

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const sag = Math.min(70, dist * 0.2)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 + sag
  return { d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`, mid: { x: mx, y: (a.y + b.y) / 2 + sag / 2 } }
}

const WIRE_COLORS = ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316', '#14b8a6']

function wireColor(from: string, to: string, index: number) {
  const ends = [from, to].map(parseRef)
  if (ends.some((e) => e.terminal === 'pos')) return '#ef4444'
  if (ends.some((e) => e.terminal === 'neg')) return '#334155'
  return WIRE_COLORS[index % WIRE_COLORS.length]
}

function flowSpeed(amps: number) {
  const a = Math.abs(amps)
  if (a < 1e-5) return 0
  return Math.min(420, Math.max(14, 120 * Math.sqrt(a / 0.02)))
}

export function CircuitBench({
  api,
  selectedId,
  onSelect,
  highlight = [],
  flowMode = 'conventional',
  showReadings = true,
  pulseDangling = false,
}: {
  api: CircuitApi
  selectedId: string | null
  onSelect: (id: string | null) => void
  highlight?: string[]
  flowMode?: FlowMode
  showReadings?: boolean
  pulseDangling?: boolean
}) {
  const { circuit, sim } = api
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [pendingFrom, setPendingFrom] = useState<string | null>(null)
  const [hoverTerm, setHoverTerm] = useState<string | null>(null)
  const [selectedWire, setSelectedWire] = useState<string | null>(null)

  const partById = useMemo(() => new Map(circuit.parts.map((p) => [p.id, p])), [circuit.parts])
  const posOf = (ref: string) => {
    const { partId, terminal } = parseRef(ref)
    const part = partById.get(partId)
    return part ? terminalPosition(part, terminal) : { x: 0, y: 0 }
  }

  const toLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }

  const nearestTerminal = (x: number, y: number, exclude?: string) => {
    let best: string | null = null
    let bestD = TERMINAL_HIT
    for (const p of circuit.parts) {
      for (const t of PART_DEFS[p.kind].terminals) {
        const ref = terminalRef(p.id, t.name)
        if (ref === exclude) continue
        const pos = terminalPosition(p, t.name)
        const d = Math.hypot(pos.x - x, pos.y - y)
        if (d < bestD) {
          bestD = d
          best = ref
        }
      }
    }
    return best
  }

  // ——— animated current along wires (one RAF loop for all wires) ———
  const flowRefs = useRef(new Map<string, SVGPathElement>())
  const currents = useRef(sim.wires)
  currents.current = sim.wires
  const modeRef = useRef(flowMode)
  modeRef.current = flowMode
  useEffect(() => {
    const phase = new Map<string, number>()
    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const dir = modeRef.current === 'electrons' ? -1 : 1
      flowRefs.current.forEach((el, id) => {
        const i = currents.current[id] ?? 0
        const p = (phase.get(id) ?? 0) + Math.sign(i) * dir * flowSpeed(i) * dt
        phase.set(id, p)
        el.style.strokeDashoffset = String(-p)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Release a held push-button even if the pointer leaves the bench.
  useEffect(() => {
    if (drag?.kind !== 'button') return
    const up = () => {
      api.setProps(drag.id, { closed: false })
      setDrag(null)
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [drag, api])

  const onPartDown = (e: ReactPointerEvent, part: Part) => {
    e.stopPropagation()
    setSelectedWire(null)
    if (part.kind === 'button' && (e.target as Element).hasAttribute('data-button-cap')) {
      api.setProps(part.id, { closed: true })
      setDrag({ kind: 'button', id: part.id })
      onSelect(part.id)
      return
    }
    const p = toLocal(e.clientX, e.clientY)
    svgRef.current?.setPointerCapture(e.pointerId)
    setDrag({ kind: 'part', id: part.id, ox: p.x - part.x, oy: p.y - part.y, sx: p.x, sy: p.y, moved: false })
  }

  const onTerminalDown = (e: ReactPointerEvent, ref: string) => {
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
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > 5
    if (drag.kind === 'part') {
      if (moved) {
        const x = Math.min(BENCH_W - 40, Math.max(40, snap(p.x - drag.ox)))
        const y = Math.min(BENCH_H - 40, Math.max(40, snap(p.y - drag.oy)))
        api.movePart(drag.id, x, y)
      }
    }
    if (moved !== drag.moved) setDrag({ ...drag, moved })
  }

  const onUp = (e: ReactPointerEvent) => {
    // Pointer capture swallows pointerleave, so clear any terminal tooltip here.
    if (e.pointerType !== 'mouse') setHoverTerm(null)
    if (!drag || drag.kind === 'button') return
    setHoverTerm(null)
    const p = toLocal(e.clientX, e.clientY)
    if (drag.kind === 'wire') {
      const target = nearestTerminal(p.x, p.y, drag.from)
      if (target && drag.moved) api.addWire(drag.from, target)
      else if (!drag.moved) setPendingFrom(drag.from)
    } else if (drag.kind === 'part' && !drag.moved) {
      const part = partById.get(drag.id)
      onSelect(drag.id)
      if (part?.kind === 'switch') api.setProps(part.id, { closed: !part.props.closed })
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
    const kind = e.dataTransfer.getData('application/x-electrohub-part') as PartKind
    if (!kind || !PART_DEFS[kind]) return
    const p = toLocal(e.clientX, e.clientY)
    const id = api.addPart(kind, snap(p.x), snap(p.y))
    onSelect(id)
  }

  const wiringFrom = drag?.kind === 'wire' ? drag.from : pendingFrom
  const connected = new Set(circuit.wires.flatMap((w) => [w.from, w.to]))
  const hl = new Set(highlight)

  return (
    <div className="relative" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BENCH_W} ${BENCH_H}`}
        className="block w-full select-none rounded-2xl border border-ink-700 bg-ink-900"
        style={{ touchAction: 'none', maxHeight: 'calc(100svh - 270px)', minHeight: 300 }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerDown={onBackgroundDown}
        role="application"
        aria-label="Circuit bench. Drag between terminals to connect wires."
      >
        <defs>
          <pattern id="bench-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1f2a44" />
          </pattern>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>
        <rect width={BENCH_W} height={BENCH_H} fill="url(#bench-grid)" />

        {/* parts */}
        {circuit.parts.map((part) => {
          const b = PART_BOUNDS[part.kind]
          const isSel = selectedId === part.id
          const isHl = hl.has(part.id)
          return (
            <g key={part.id} transform={`translate(${part.x} ${part.y})`}>
              {isHl && <rect x={-b.w / 2 - 14} y={-b.h / 2 - 14} width={b.w + 28} height={b.h + 28} rx="16" fill="#f43f5e" opacity="0.12" transform={`rotate(${part.rot})`} />}
              <g transform={`rotate(${part.rot})`} filter="url(#soft)" onPointerDown={(e) => onPartDown(e, part)} style={{ cursor: drag?.kind === 'part' ? 'grabbing' : 'grab' }}>
                <rect x={-b.w / 2 - 6} y={-b.h / 2 - 6} width={b.w + 12} height={b.h + 12} fill="transparent" />
                <PartGlyph part={part} result={sim.parts[part.id]} />
              </g>
              {isSel && (
                <rect
                  x={-b.w / 2 - 10}
                  y={-b.h / 2 - 10}
                  width={b.w + 20}
                  height={b.h + 20}
                  rx="12"
                  fill="none"
                  stroke="#fbbf24"
                  strokeDasharray="5 5"
                  transform={`rotate(${part.rot})`}
                  pointerEvents="none"
                />
              )}
            </g>
          )
        })}

        {/* wires */}
        {circuit.wires.map((w, i) => {
          const a = posOf(w.from)
          const b = posOf(w.to)
          const { d, mid } = wirePath(a, b)
          const color = wireColor(w.from, w.to, i)
          const isHl = hl.has(w.id)
          const amps = sim.wires[w.id] ?? 0
          const flowing = Math.abs(amps) > 1e-5 && flowMode !== 'off'
          return (
            <g key={w.id}>
              {isHl && <path d={d} stroke="#f43f5e" strokeWidth="14" fill="none" opacity="0.35" filter="url(#glow)" />}
              <path d={d} stroke="#05080f" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d={d} stroke={color} strokeWidth="5.5" fill="none" strokeLinecap="round" />
              <path
                ref={(el) => {
                  if (el) flowRefs.current.set(w.id, el)
                  else flowRefs.current.delete(w.id)
                }}
                d={d}
                stroke={flowMode === 'electrons' ? '#93c5fd' : '#fde68a'}
                strokeWidth="3"
                strokeDasharray="1 13"
                strokeLinecap="round"
                fill="none"
                opacity={flowing ? Math.min(1, 0.45 + Math.abs(amps) * 30) : 0}
                pointerEvents="none"
              />
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

        {/* wire being drawn */}
        {wiringFrom && pointer && (
          <path d={wirePath(posOf(wiringFrom), pointer).d} stroke="#fbbf24" strokeWidth="4" strokeDasharray="8 6" fill="none" pointerEvents="none" />
        )}

        {/* terminals */}
        {circuit.parts.map((part) =>
          PART_DEFS[part.kind].terminals.map((t) => {
            const ref = terminalRef(part.id, t.name)
            const pos = terminalPosition(part, t.name)
            const isConnected = connected.has(ref)
            const color = t.name === 'pos' || t.name === 'anode' ? '#fbbf24' : t.name === 'neg' || t.name === 'cathode' ? '#38bdf8' : '#cbd5e1'
            const active = wiringFrom === ref
            return (
              <g key={ref} transform={`translate(${pos.x} ${pos.y})`}>
                {!isConnected && pulseDangling && <circle r="7" fill="none" stroke="#fbbf24" strokeWidth="2" className="terminal-pulse" />}
                {/* generous invisible hit area so terminals are easy to grab on touch screens */}
                <circle r="20" fill="transparent" style={{ cursor: 'crosshair' }} onPointerDown={(e) => onTerminalDown(e, ref)} />
                <circle
                  r={hoverTerm === ref || active ? 10 : 8}
                  fill={isConnected ? color : '#0b1120'}
                  stroke={color}
                  strokeWidth="3"
                  style={{ cursor: 'crosshair', transition: 'r 0.1s' }}
                  onPointerDown={(e) => onTerminalDown(e, ref)}
                  onPointerEnter={() => setHoverTerm(ref)}
                  onPointerLeave={() => setHoverTerm((h) => (h === ref ? null : h))}
                />
                {t.label && (
                  <text y="-14" textAnchor="middle" fontSize="13" fontWeight="800" fill={color} pointerEvents="none">
                    {t.label}
                  </text>
                )}
              </g>
            )
          }),
        )}

        {/* live readings */}
        {showReadings &&
          circuit.parts.map((part) => {
            const r = sim.parts[part.id]
            const b = PART_BOUNDS[part.kind]
            // Vertical parts have terminals above/below, so put readings beside them.
            const vertical = part.rot % 180 !== 0
            const x = vertical ? part.x + b.h / 2 + 12 : part.x
            const y = vertical ? part.y + 4 : part.y + b.h / 2 + 22
            let text = ''
            if (part.kind === 'battery') text = `${part.props.voltage} V · ${formatAmps(r?.current ?? 0)}`
            if (part.kind === 'resistor') text = `${formatOhms(part.props.ohms ?? 0)} · ${formatAmps(r?.current ?? 0)}`
            if (part.kind === 'led') text = part.props.burnt ? 'burnt out' : r?.overload ? `${formatAmps(r.current)}!!` : formatAmps(r?.current ?? 0)
            if (part.kind === 'switch') text = part.props.closed ? 'closed (click)' : 'open (click)'
            if (part.kind === 'button') text = part.props.closed ? 'pressed' : 'hold to press'
            const danger = part.kind === 'led' && (part.props.burnt || r?.overload)
            return (
              <text key={part.id} x={x} y={y} textAnchor={vertical ? 'start' : 'middle'} fontSize="12" fontFamily="JetBrains Mono, monospace" fill={danger ? '#fb7185' : '#8a9bb8'} pointerEvents="none">
                {text}
              </text>
            )
          })}

        {/* terminal tooltip */}
        {hoverTerm &&
          (() => {
            const { partId, terminal } = parseRef(hoverTerm)
            const part = partById.get(partId)
            if (!part) return null
            const def = PART_DEFS[part.kind].terminals.find((t) => t.name === terminal)!
            const pos = terminalPosition(part, terminal)
            const v = sim.terminalVoltage[hoverTerm] ?? 0
            const text = `${def.hint} · ${v.toFixed(2)} V`
            const w = Math.min(380, text.length * 6.4 + 20)
            const x = Math.min(BENCH_W - w - 6, Math.max(6, pos.x - w / 2))
            const y = pos.y < 70 ? pos.y + 20 : pos.y - 46
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
          Now click another terminal to connect · click empty space to cancel
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diagnose } from '../sim/diagnose'
import { PART_DEFS, terminalRef } from '../sim/parts'
import { simulate } from '../sim/solve'
import type { Circuit, Part, PartKind, PartProps, Rotation, TerminalRef } from '../sim/types'

/** How long an overloaded LED shines (too brightly) before it pops. */
const BURN_DELAY_MS = 450

export function useCircuit(initial: Circuit) {
  const [circuit, setCircuit] = useState<Circuit>(initial)
  const counter = useRef(1)

  const sim = useMemo(() => simulate(circuit), [circuit])
  const issues = useMemo(() => diagnose(circuit, sim), [circuit, sim])

  // Over-current LEDs burn out after a short, very bright moment.
  useEffect(() => {
    const overloaded = circuit.parts.filter((p) => p.kind === 'led' && !p.props.burnt && sim.parts[p.id]?.overload)
    if (!overloaded.length) return
    const t = setTimeout(() => {
      setCircuit((c) => ({
        ...c,
        parts: c.parts.map((p) =>
          overloaded.some((o) => o.id === p.id) ? { ...p, props: { ...p.props, burnt: true, burntAt: sim.parts[p.id].current } } : p,
        ),
      }))
    }, BURN_DELAY_MS)
    return () => clearTimeout(t)
  }, [circuit, sim])

  const nextId = (prefix: string) => {
    let id: string
    do {
      id = `${prefix}${counter.current++}`
    } while (circuit.parts.some((p) => p.id === id) || circuit.wires.some((w) => w.id === id))
    return id
  }

  const addPart = (kind: PartKind, x: number, y: number) => {
    const id = nextId(kind === 'resistor' ? 'r' : kind === 'battery' ? 'bat' : kind)
    const part: Part = { id, kind, x, y, rot: 0, props: { ...PART_DEFS[kind].defaults } }
    setCircuit((c) => ({ ...c, parts: [...c.parts, part] }))
    return id
  }

  const movePart = useCallback((id: string, x: number, y: number) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, x, y } : p)) }))
  }, [])

  const rotatePart = (id: string) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, rot: (((p.rot + 90) % 360) as Rotation) } : p)) }))
  }

  const deletePart = (id: string) => {
    setCircuit((c) => ({
      parts: c.parts.filter((p) => p.id !== id),
      wires: c.wires.filter((w) => !w.from.startsWith(`${id}:`) && !w.to.startsWith(`${id}:`)),
    }))
  }

  const setProps = useCallback((id: string, props: Partial<PartProps>) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, props: { ...p.props, ...props } } : p)) }))
  }, [])

  const addWire = (from: TerminalRef, to: TerminalRef) => {
    if (from === to) return
    const exists = circuit.wires.some((w) => (w.from === from && w.to === to) || (w.from === to && w.to === from))
    if (exists) return
    const id = nextId('w')
    setCircuit((c) => ({ ...c, wires: [...c.wires, { id, from, to }] }))
  }

  const removeWire = (id: string) => setCircuit((c) => ({ ...c, wires: c.wires.filter((w) => w.id !== id) }))

  /** Turn an LED around: its legs swap places, so the wires now meet the other leg. */
  const flipLed = (id: string) => {
    const a = terminalRef(id, 'anode')
    const k = terminalRef(id, 'cathode')
    const swap = (t: string) => (t === a ? k : t === k ? a : t)
    setCircuit((c) => ({
      parts: c.parts.map((p) => (p.id === id ? { ...p, rot: (((p.rot + 180) % 360) as Rotation) } : p)),
      wires: c.wires.map((w) => ({ ...w, from: swap(w.from), to: swap(w.to) })),
    }))
  }

  const replaceLed = (id: string) => setProps(id, { burnt: false, burntAt: undefined })

  const reset = (to: Circuit = initial) => setCircuit(to)

  return { circuit, sim, issues, addPart, movePart, rotatePart, deletePart, setProps, addWire, removeWire, flipLed, replaceLed, reset, setCircuit }
}

export type CircuitApi = ReturnType<typeof useCircuit>

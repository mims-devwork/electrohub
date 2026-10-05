import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BOARD } from './board'
import { diagnoseMicro } from './diagnose'
import { PROGRAMS, defaultSlots } from './programs'
import { emptyMemory, runFrame, type Frame } from './runtime'
import type { BoardPin, MicroCircuit, MicroInputs, MicroPart, MicroPartKind, MicroRef, MicroSetup } from './types'

/** How often loop() runs on our simulated board (ms). Real boards are far faster. */
const TICK_MS = 60
/** Print to the serial monitor every few passes so it stays readable. */
const SERIAL_EVERY = 4
const SERIAL_LINES = 9
const SCOPE_SAMPLES = 90
/** How long "uploading" takes after the code changes (ms). */
const UPLOAD_MS = 900

const initialInputs = (setup: MicroSetup): MicroInputs => ({
  knob: Object.fromEntries(setup.parts.filter((p) => p.kind === 'pot').map((p) => [p.id, setup.knob ?? 0.5])),
  pressed: {},
})

/** What the scope shows for a pin: what the program read, what it wrote, or the raw voltage. */
function scopeSample(frame: Frame, pin: BoardPin): number {
  if (!frame.running) return 0
  const read = frame.reads[pin]
  if (read !== undefined) return pin.startsWith('A') ? read / BOARD.adcMax : read
  const out = frame.outputs[pin]
  if (out !== undefined) return out
  return frame.sol.pinVolts[pin] / BOARD.volts
}

export function useMicro(setup: MicroSetup) {
  const [circuit, setCircuit] = useState<MicroCircuit>({ parts: setup.parts, wires: setup.wires })
  const [inputs, setInputs] = useState<MicroInputs>(() => initialInputs(setup))
  const [slots, setSlots] = useState(() => defaultSlots(setup.program, setup.slots))
  const [uploading, setUploading] = useState(false)
  /** Bumped every time new code finishes uploading. */
  const [uploads, setUploads] = useState(0)
  const mem = useRef(emptyMemory())
  const [frame, setFrame] = useState<Frame>(() => runFrame({ parts: setup.parts, wires: setup.wires }, initialInputs(setup), setup.program, defaultSlots(setup.program, setup.slots), {}, mem.current, Math.random))
  const [serial, setSerial] = useState<string[]>([])
  const [scope, setScope] = useState<Partial<Record<BoardPin, number>>[]>(() => Array(SCOPE_SAMPLES).fill({}))
  const counter = useRef(1)

  // The loop reads the latest state through refs so the interval never restarts.
  const live = useRef({ circuit, inputs, slots, uploading, frame })
  live.current = { circuit, inputs, slots, uploading, frame }

  useEffect(() => {
    let ticks = 0
    const t = setInterval(() => {
      const s = live.current
      const f = runFrame(s.circuit, s.inputs, setup.program, s.slots, s.frame.outputs, mem.current, Math.random, s.uploading)
      live.current.frame = f
      setFrame(f)
      setScope((h) => [...h.slice(1), Object.fromEntries(setup.scope.map((pin) => [pin, scopeSample(f, pin)]))])
      ticks++
      if (f.serial !== undefined && ticks % SERIAL_EVERY === 0) setSerial((lines) => [...lines.slice(-(SERIAL_LINES - 1)), f.serial!])
    }, TICK_MS)
    return () => clearInterval(t)
  }, [setup])

  const issues = useMemo(() => diagnoseMicro(circuit, inputs, frame, setup.program, slots), [circuit, inputs, frame, setup.program, slots])

  // Changing the code means re-uploading it: the board stops for a moment, then runs the new version.
  useEffect(() => {
    if (!uploading) return
    const t = setTimeout(() => {
      setUploading(false)
      setUploads((n) => n + 1)
    }, UPLOAD_MS)
    return () => clearTimeout(t)
  }, [uploading, slots])

  const setSlot = (id: string, value: string) => {
    if (slots[id] === value) return
    setSlots((s) => ({ ...s, [id]: value }))
    setUploading(true)
    setSerial([])
  }

  const setKnob = useCallback((id: string, pos: number) => setInputs((i) => ({ ...i, knob: { ...i.knob, [id]: Math.min(1, Math.max(0, pos)) } })), [])
  const setPressed = useCallback((id: string, pressed: boolean) => setInputs((i) => (!!i.pressed[id] === pressed ? i : { ...i, pressed: { ...i.pressed, [id]: pressed } })), [])

  const nextId = (prefix: string) => {
    let id: string
    do {
      id = `${prefix}${counter.current++}`
    } while (circuit.parts.some((p) => p.id === id) || circuit.wires.some((w) => w.id === id))
    return id
  }

  const addWire = (from: MicroRef, to: MicroRef) => {
    if (from === to) return
    if (circuit.wires.some((w) => (w.from === from && w.to === to) || (w.from === to && w.to === from))) return
    const id = nextId('w')
    setCircuit((c) => ({ ...c, wires: [...c.wires, { id, from, to }] }))
  }

  const removeWire = (id: string) => setCircuit((c) => ({ ...c, wires: c.wires.filter((w) => w.id !== id) }))

  const addPart = (kind: MicroPartKind, x: number, y: number) => {
    const id = nextId(kind === 'resistor' ? 'r' : kind)
    const part: MicroPart = { id, kind, x, y, props: kind === 'resistor' ? { ohms: BOARD.trayOhms } : {} }
    setCircuit((c) => ({ ...c, parts: [...c.parts, part] }))
    if (kind === 'pot') setKnob(id, 0.5)
    return id
  }

  const movePart = useCallback((id: string, x: number, y: number) => {
    setCircuit((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, x, y } : p)) }))
  }, [])

  const deletePart = (id: string) =>
    setCircuit((c) => ({
      parts: c.parts.filter((p) => p.id !== id),
      wires: c.wires.filter((w) => !w.from.startsWith(`${id}:`) && !w.to.startsWith(`${id}:`)),
    }))

  const reset = () => {
    setCircuit({ parts: setup.parts, wires: setup.wires })
    setInputs(initialInputs(setup))
    setSlots(defaultSlots(setup.program, setup.slots))
    setUploading(false)
    setSerial([])
    mem.current = emptyMemory()
  }

  return {
    program: PROGRAMS[setup.program],
    scopePins: setup.scope,
    circuit,
    inputs,
    frame,
    slots,
    uploading,
    uploads,
    serial,
    scope,
    issues,
    setSlot,
    setKnob,
    setPressed,
    addWire,
    removeWire,
    addPart,
    movePart,
    deletePart,
    reset,
  }
}

export type MicroApi = ReturnType<typeof useMicro>

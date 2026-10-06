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

/** Room temperature, and roughly the temperature of fingers wrapped round a sensor (°C). */
const ROOM_C = 21
const FINGERS_C = 33
/** How quickly a sensor warms up or cools down (s). */
const WARM_LAG = 3

const initialInputs = (setup: MicroSetup): MicroInputs => ({
  knob: Object.fromEntries(setup.parts.filter((p) => p.kind === 'pot').map((p) => [p.id, setup.knob ?? 0.5])),
  pressed: {},
  temp: Object.fromEntries(setup.parts.filter((p) => p.kind === 'tmp36').map((p) => [p.id, ROOM_C])),
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
  /** Why the board is busy: new code, or someone pressed its reset button. */
  const [bootReason, setBootReason] = useState<'upload' | 'reset'>('upload')
  /** Sensors being held between someone's fingers. */
  const warm = useRef<Record<string, boolean>>({})
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
      // Held sensors warm up towards finger temperature; let go and they cool back to the room.
      const temps = s.inputs.temp ?? {}
      const ease = 1 - Math.exp(-(TICK_MS / 1000) / WARM_LAG)
      let warmed = false
      const nextTemps = Object.fromEntries(
        s.circuit.parts
          .filter((p) => p.kind === 'tmp36')
          .map((p) => {
            const now = temps[p.id] ?? ROOM_C
            const next = now + ((warm.current[p.id] ? FINGERS_C : ROOM_C) - now) * ease
            if (Math.abs(next - now) > 0.002) warmed = true
            return [p.id, next]
          }),
      )
      if (warmed) {
        s.inputs = { ...s.inputs, temp: nextTemps }
        setInputs((i) => ({ ...i, temp: nextTemps }))
      }
      const f = runFrame(s.circuit, s.inputs, setup.program, s.slots, s.frame.outputs, mem.current, Math.random, s.uploading, TICK_MS / 1000)
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
    setBootReason('upload')
    setUploading(true)
    setSerial([])
  }

  /** Press the board's reset button: the program starts again from setup(), with fresh variables. */
  const restart = () => {
    setBootReason('reset')
    setUploading(true)
    setSerial([])
  }

  const setWarm = (id: string, held: boolean) => {
    warm.current = { ...warm.current, [id]: held }
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
    const props: MicroPart['props'] = kind === 'resistor' ? { ohms: BOARD.trayOhms } : kind === 'battery' ? { voltage: BOARD.batteryVolts } : {}
    const part: MicroPart = { id, kind, x, y, props }
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
    warm.current = {}
  }

  return {
    program: PROGRAMS[setup.program],
    scopePins: setup.scope,
    circuit,
    inputs,
    frame,
    slots,
    uploading,
    bootReason,
    uploads,
    serial,
    scope,
    issues,
    setSlot,
    restart,
    setWarm,
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

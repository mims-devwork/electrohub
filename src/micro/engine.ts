import { LED_SPECS } from '../sim/parts'
import { BOARD, BOARD_PINS, boardRef, microTerminals, parseMicroRef } from './board'
import type { BoardPin, MicroCircuit, MicroInputs, MicroRef, PinOutputs } from './types'

/**
 * Works out what every pin and part on the Microcontroller Lab bench sees.
 *
 * Wires join terminals into nets (everything joined by bare wire is one node).
 * The 5 V pin and any output pins are sources with a little internal
 * resistance; resistors, the potentiometer's two halves and closed buttons are
 * conductances; LED modules are "off" or "forward voltage + 235 Ω", guessed and
 * re-solved like the Circuit Lab solver. Input pins draw no current at all,
 * so a net that no source can reach is floating: its voltage is undefined.
 */

const GMIN = 1e-9
/** Any element with more conductance than this counts as a real connection. */
const CONNECTED = 1e-7

interface Stamp {
  a: number
  b: number
  g: number
  /** Built-in source voltage pushing from b to a (a ends up higher). */
  src: number
}

export interface LedReading {
  /** Average current through the LED (A). */
  current: number
  /** 0…1 how bright it looks. */
  brightness: number
  /** 0…1 fraction of full brightness, i.e. what the program asked for. */
  level: number
  /** Wired the wrong way round, with voltage across it. */
  reversed: boolean
}

export interface BoardSolution {
  /** False when the board's fuse has cut the power because 5V touches GND. */
  powered: boolean
  /** Current drawn from the 5 V pin (A); huge when it's shorted. */
  supplyCurrent: number
  netOf: Record<MicroRef, number>
  /** Average voltage of each net (PWM is averaged). */
  netVolts: number[]
  floating: boolean[]
  pinVolts: Record<BoardPin, number>
  pinFloating: Record<BoardPin, boolean>
  /** Current pushed out of each output pin (A). */
  pinCurrent: Partial<Record<BoardPin, number>>
  leds: Record<string, LedReading>
}

const PIN_IDS = BOARD_PINS.map((p) => p.pin)

/** Group terminals joined by wires into nets. Net 0 is always ground. */
export function buildNets(circuit: MicroCircuit) {
  const parent = new Map<MicroRef, MicroRef>()
  const find = (r: MicroRef): MicroRef => {
    let p = parent.get(r) ?? r
    if (p !== r) {
      p = find(p)
      parent.set(r, p)
    }
    return p
  }
  const union = (a: MicroRef, b: MicroRef) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  const refs: MicroRef[] = [boardRef('GND'), ...PIN_IDS.filter((p) => p !== 'GND').map(boardRef), ...circuit.parts.flatMap(microTerminals)]
  const known = new Set(refs)
  // All ground pins are joined inside the board.
  union(boardRef('GND'), boardRef('GND2'))
  for (const w of circuit.wires) if (known.has(w.from) && known.has(w.to) && w.from !== w.to) union(w.from, w.to)

  const rootIndex = new Map<MicroRef, number>()
  const netOf: Record<MicroRef, number> = {}
  for (const r of refs) {
    const root = find(r)
    if (!rootIndex.has(root)) rootIndex.set(root, rootIndex.size)
    netOf[r] = rootIndex.get(root)!
  }
  return { netOf, count: rootIndex.size }
}

function solveLinear(n: number, stamps: Stamp[]): Float64Array {
  // G·v = i with node 0 (ground) fixed at 0 V.
  const m = n - 1
  const v = new Float64Array(n)
  if (m <= 0) return v
  const G = Array.from({ length: m }, () => new Float64Array(m))
  const I = new Float64Array(m)
  for (let k = 0; k < m; k++) G[k][k] += GMIN
  for (const { a, b, g, src } of stamps) {
    const ia = a - 1
    const ib = b - 1
    if (ia >= 0) G[ia][ia] += g
    if (ib >= 0) G[ib][ib] += g
    if (ia >= 0 && ib >= 0) {
      G[ia][ib] -= g
      G[ib][ia] -= g
    }
    if (src !== 0) {
      if (ia >= 0) I[ia] += g * src
      if (ib >= 0) I[ib] -= g * src
    }
  }
  // Gaussian elimination with partial pivoting.
  for (let col = 0; col < m; col++) {
    let pivot = col
    for (let r = col + 1; r < m; r++) if (Math.abs(G[r][col]) > Math.abs(G[pivot][col])) pivot = r
    if (pivot !== col) {
      ;[G[col], G[pivot]] = [G[pivot], G[col]]
      ;[I[col], I[pivot]] = [I[pivot], I[col]]
    }
    const d = G[col][col]
    if (Math.abs(d) < 1e-30) continue
    for (let r = col + 1; r < m; r++) {
      const f = G[r][col] / d
      if (f === 0) continue
      for (let c = col; c < m; c++) G[r][c] -= f * G[col][c]
      I[r] -= f * I[col]
    }
  }
  for (let r = m - 1; r >= 0; r--) {
    let s = I[r]
    for (let c = r + 1; c < m; c++) s -= G[r][c] * v[c + 1]
    v[r + 1] = Math.abs(G[r][r]) < 1e-30 ? 0 : s / G[r][r]
  }
  return v
}

interface StateSolve {
  v: Float64Array
  stamps: { owner: string; stamp: Stamp }[]
  ledOn: Map<string, boolean>
}

/** Solve the bench with every output pin fully HIGH or LOW. */
function solveState(circuit: MicroCircuit, inputs: MicroInputs, levels: PinOutputs, powered: boolean, netOf: Record<MicroRef, number>, n: number): StateSolve {
  const node = (ref: MicroRef) => netOf[ref]
  const leds = circuit.parts.filter((p) => p.kind === 'led')
  const ledOn = new Map(leds.map((l) => [l.id, false]))

  const build = () => {
    const stamps: { owner: string; stamp: Stamp }[] = []
    if (powered) {
      stamps.push({ owner: 'supply', stamp: { a: node(boardRef('5V')), b: 0, g: 1 / BOARD.supplyOhms, src: BOARD.volts } })
      for (const [pin, level] of Object.entries(levels) as [BoardPin, number][]) {
        stamps.push({ owner: `pin:${pin}`, stamp: { a: node(boardRef(pin)), b: 0, g: 1 / BOARD.pinOhms, src: level * BOARD.volts } })
      }
    }
    for (const p of circuit.parts) {
      const t = (name: string) => node(`${p.id}:${name}`)
      switch (p.kind) {
        case 'resistor':
          stamps.push({ owner: p.id, stamp: { a: t('a'), b: t('b'), g: 1 / Math.max(1, p.props.ohms ?? BOARD.trayOhms), src: 0 } })
          break
        case 'pot': {
          const pos = Math.min(1, Math.max(0, inputs.knob[p.id] ?? 0.5))
          stamps.push({ owner: `${p.id}:aw`, stamp: { a: t('a'), b: t('w'), g: 1 / Math.max(0.5, BOARD.potOhms * pos), src: 0 } })
          stamps.push({ owner: `${p.id}:wb`, stamp: { a: t('w'), b: t('b'), g: 1 / Math.max(0.5, BOARD.potOhms * (1 - pos)), src: 0 } })
          break
        }
        case 'button':
          if (inputs.pressed[p.id]) stamps.push({ owner: p.id, stamp: { a: t('a'), b: t('b'), g: 1 / 0.05, src: 0 } })
          break
        case 'led':
          if (ledOn.get(p.id)) {
            const vf = LED_SPECS[p.props.color ?? 'red'].vf
            stamps.push({ owner: p.id, stamp: { a: t('anode'), b: t('cathode'), g: 1 / (BOARD.ledOhms + 15), src: vf } })
          }
          break
      }
    }
    return stamps
  }

  let stamps = build()
  let v = solveLinear(n, stamps.map((s) => s.stamp))
  for (let iter = 0; iter < 20; iter++) {
    let changed = false
    for (const led of leds) {
      const vd = v[node(`${led.id}:anode`)] - v[node(`${led.id}:cathode`)]
      const vf = LED_SPECS[led.props.color ?? 'red'].vf
      const on = ledOn.get(led.id)!
      if (!on && vd > vf + 1e-6) {
        ledOn.set(led.id, true)
        changed = true
      } else if (on && vd < vf - 1e-9) {
        ledOn.set(led.id, false)
        changed = true
      }
    }
    if (!changed) break
    stamps = build()
    v = solveLinear(n, stamps.map((s) => s.stamp))
  }
  return { v, stamps, ledOn }
}

const current = (s: Stamp, v: Float64Array) => s.g * (v[s.a] - v[s.b]) - s.g * s.src

/**
 * Solve the whole bench for the given hands-on inputs and program outputs.
 * Output levels between 0 and 1 are PWM: we solve the HIGH and LOW moments
 * separately and average them by the duty cycle, which is what a meter (or
 * your eye, for an LED) sees.
 */
export function solveBoard(circuit: MicroCircuit, inputs: MicroInputs, outputs: PinOutputs): BoardSolution {
  const { netOf, count } = buildNets(circuit)
  const n = count

  const highs: PinOutputs = {}
  const lows: PinOutputs = {}
  const pwmDuties: number[] = []
  for (const [pin, level] of Object.entries(outputs) as [BoardPin, number][]) {
    highs[pin] = level > 0 ? 1 : 0
    lows[pin] = level >= 1 ? 1 : 0
    if (level > 0 && level < 1) pwmDuties.push(level)
  }
  const duty = pwmDuties.length ? pwmDuties.reduce((s, d) => s + d, 0) / pwmDuties.length : 1

  // If 5V is shorted to GND the board's fuse trips and everything goes dark.
  let powered = true
  let hi = solveState(circuit, inputs, highs, true, netOf, n)
  const supplyStamp = hi.stamps.find((s) => s.owner === 'supply')!.stamp
  const supplyCurrent = -current(supplyStamp, hi.v)
  if (supplyCurrent > BOARD.fuseAmps) {
    powered = false
    hi = solveState(circuit, inputs, {}, false, netOf, n)
  }
  const lo = powered && pwmDuties.length ? solveState(circuit, inputs, lows, true, netOf, n) : hi
  const mix = (h: number, l: number) => (pwmDuties.length ? h * duty + l * (1 - duty) : h)

  const netVolts = Array.from({ length: n }, (_, i) => mix(hi.v[i], lo.v[i]))

  // Floating nets: nothing that sets a voltage can reach them.
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const { stamp } of hi.stamps) {
    if (stamp.g > CONNECTED && stamp.a !== stamp.b) {
      adj[stamp.a].push(stamp.b)
      adj[stamp.b].push(stamp.a)
    }
  }
  const driven = new Array<boolean>(n).fill(false)
  const queue = [0]
  driven[0] = true
  for (const { owner, stamp } of hi.stamps) {
    if ((owner === 'supply' || owner.startsWith('pin:')) && !driven[stamp.a]) {
      driven[stamp.a] = true
      queue.push(stamp.a)
    }
  }
  while (queue.length) {
    const k = queue.pop()!
    for (const j of adj[k]) {
      if (!driven[j]) {
        driven[j] = true
        queue.push(j)
      }
    }
  }
  const floating = driven.map((d) => !d)

  const pinVolts = {} as Record<BoardPin, number>
  const pinFloating = {} as Record<BoardPin, boolean>
  for (const pin of PIN_IDS) {
    const k = netOf[boardRef(pin)]
    pinVolts[pin] = powered || pin === 'GND' || pin === 'GND2' ? netVolts[k] : 0
    pinFloating[pin] = floating[k]
  }

  const pinCurrent: Partial<Record<BoardPin, number>> = {}
  if (powered) {
    for (const pin of Object.keys(outputs) as BoardPin[]) {
      const sh = hi.stamps.find((s) => s.owner === `pin:${pin}`)?.stamp
      const sl = lo.stamps.find((s) => s.owner === `pin:${pin}`)?.stamp
      // Current leaving the pin is the reverse of the element current (b → a).
      const ih = sh ? Math.abs(current(sh, hi.v)) : 0
      const il = sl ? Math.abs(current(sl, lo.v)) : 0
      pinCurrent[pin] = Math.max(ih, il)
    }
  }

  const leds: Record<string, LedReading> = {}
  for (const led of circuit.parts.filter((p) => p.kind === 'led')) {
    const vf = LED_SPECS[led.props.color ?? 'red'].vf
    const ledCurrent = (s: StateSolve) => {
      const st = s.stamps.find((x) => x.owner === led.id)?.stamp
      return st && s.ledOn.get(led.id) ? Math.max(0, current(st, s.v)) : 0
    }
    const avg = mix(ledCurrent(hi), ledCurrent(lo))
    // Fully on, straight from an output pin.
    const full = (BOARD.volts - vf) / (BOARD.ledOhms + 15 + BOARD.pinOhms)
    const a = netVolts[netOf[`${led.id}:anode`]]
    const c = netVolts[netOf[`${led.id}:cathode`]]
    leds[led.id] = {
      current: avg,
      brightness: Math.min(1, Math.sqrt(avg / 0.02)),
      level: Math.min(1, avg / full),
      reversed: avg < 1e-5 && c - a > 0.5,
    }
  }

  return { powered, supplyCurrent: powered ? supplyCurrent : 0, netOf, netVolts, floating, pinVolts, pinFloating, pinCurrent, leds }
}

/** Do this pin and that terminal share a net (are they wired together)? */
export function sameNet(sol: BoardSolution, a: MicroRef, b: MicroRef) {
  return sol.netOf[a] !== undefined && sol.netOf[a] === sol.netOf[b]
}

/** Which header pins share a net with this terminal. */
export function pinsOnNet(sol: BoardSolution, ref: MicroRef): BoardPin[] {
  const k = sol.netOf[ref]
  return PIN_IDS.filter((p) => sol.netOf[boardRef(p)] === k)
}

export function partIdOf(ref: MicroRef) {
  return parseMicroRef(ref).partId
}

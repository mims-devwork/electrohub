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
 *
 * Robot parts follow the same idea. A battery pack is another source; a motor
 * is a resistance whose voltage sets its speed; the motor driver is four
 * switches (an H-bridge) whose positions depend on its EN and DIR inputs, so
 * it's guessed and re-solved like an LED. It only obeys those inputs if its
 * GND is connected to the board's GND: without a shared 0 V, "5 V on EN"
 * means nothing to it.
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

export interface MotorReading {
  /** Average voltage across the motor, a − b (V). */
  volts: number
  current: number
  /** Speed the voltage is asking for, −1…1 (the shaft catches up over time). */
  target: number
}

export interface DriverReading {
  /** Shares a ground with the board, so it can understand EN and DIR. */
  grounded: boolean
  /** Has motor power on VM. */
  powered: boolean
  /** Fraction of the time EN reads HIGH. */
  enable: number
  dir: 0 | 1
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
  tmps: Record<string, { powered: boolean; reversed: boolean }>
  /** Angle each servo is holding, or null if it has no power or no valid signal. */
  servos: Record<string, { powered: boolean; angle: number | null }>
  motors: Record<string, MotorReading>
  drivers: Record<string, DriverReading>
  /** Which pin each encoder's pulses reach, if it has power. */
  encoders: Record<string, { powered: boolean; pins: BoardPin[] }>
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
  tmpOn: Map<string, boolean>
  tmpReversed: Map<string, boolean>
  drive: Map<string, { en: boolean; dir: 0 | 1; grounded: boolean }>
}

/** Which nets can be reached from the given seeds through real connections. */
function reach(n: number, stamps: { stamp: Stamp }[], seeds: number[]): boolean[] {
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const { stamp } of stamps) {
    if (stamp.g > CONNECTED && stamp.a !== stamp.b) {
      adj[stamp.a].push(stamp.b)
      adj[stamp.b].push(stamp.a)
    }
  }
  const seen = new Array<boolean>(n).fill(false)
  const queue: number[] = []
  for (const k of seeds) {
    if (!seen[k]) {
      seen[k] = true
      queue.push(k)
    }
  }
  while (queue.length) {
    const k = queue.pop()!
    for (const j of adj[k]) {
      if (!seen[j]) {
        seen[j] = true
        queue.push(j)
      }
    }
  }
  return seen
}

/** Solve the bench with every output pin fully HIGH or LOW. */
function solveState(circuit: MicroCircuit, inputs: MicroInputs, levels: PinOutputs, powered: boolean, netOf: Record<MicroRef, number>, n: number): StateSolve {
  const node = (ref: MicroRef) => netOf[ref]
  const leds = circuit.parts.filter((p) => p.kind === 'led')
  const tmps = circuit.parts.filter((p) => p.kind === 'tmp36')
  const drivers = circuit.parts.filter((p) => p.kind === 'driver')
  const ledOn = new Map(leds.map((l) => [l.id, false]))
  const tmpOn = new Map(tmps.map((t) => [t.id, false]))
  const tmpReversed = new Map(tmps.map((t) => [t.id, false]))
  const drive = new Map(drivers.map((d) => [d.id, { en: false, dir: 0 as 0 | 1, grounded: false }]))

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
        case 'tmp36':
          if (tmpOn.get(p.id)) {
            const celsius = inputs.temp?.[p.id] ?? 21
            stamps.push({ owner: p.id, stamp: { a: t('out'), b: t('gnd'), g: 1 / 50, src: BOARD.tmpOffset + BOARD.tmpPerDegree * celsius } })
          }
          // Fitted backwards, current pours through its protection diode and it heats up.
          if (tmpReversed.get(p.id)) stamps.push({ owner: `${p.id}:rev`, stamp: { a: t('gnd'), b: t('vs'), g: 1 / 30, src: 0.7 } })
          break
        case 'servo':
          stamps.push({ owner: p.id, stamp: { a: t('pwr'), b: t('gnd'), g: 1 / BOARD.servoOhms, src: 0 } })
          break
        case 'motor':
          stamps.push({ owner: p.id, stamp: { a: t('a'), b: t('b'), g: 1 / BOARD.motorOhms, src: 0 } })
          break
        case 'battery':
          stamps.push({ owner: p.id, stamp: { a: t('pos'), b: t('neg'), g: 1 / BOARD.batteryOhms, src: p.props.voltage ?? BOARD.batteryVolts } })
          break
        case 'driver': {
          // An H-bridge: each output is switched to VM or to GND.
          const d = drive.get(p.id)!
          const g = 1 / BOARD.driverOhms
          const high = d.en ? (d.dir ? 'ob' : 'oa') : null
          for (const out of ['oa', 'ob']) {
            stamps.push({ owner: `${p.id}:${out}`, stamp: out === high ? { a: t(out), b: t('vm'), g, src: 0 } : { a: t(out), b: t('gnd'), g, src: 0 } })
          }
          break
        }
        case 'encoder':
          // Its output switches so fast that the pin sees an average; the pulses themselves are counted by the runtime.
          if (powered) stamps.push({ owner: p.id, stamp: { a: t('out'), b: t('gnd'), g: 1 / 1000, src: 0 } })
          break
      }
    }
    return stamps
  }

  let stamps = build()
  let v = solveLinear(n, stamps.map((s) => s.stamp))
  for (let iter = 0; iter < 20; iter++) {
    let changed = false
    const set = <T,>(map: Map<string, T>, id: string, value: T, same: (a: T, b: T) => boolean = (a, b) => a === b) => {
      if (!same(map.get(id)!, value)) {
        map.set(id, value)
        changed = true
      }
    }
    for (const led of leds) {
      const vd = v[node(`${led.id}:anode`)] - v[node(`${led.id}:cathode`)]
      const vf = LED_SPECS[led.props.color ?? 'red'].vf
      const on = ledOn.get(led.id)!
      if (!on && vd > vf + 1e-6) set(ledOn, led.id, true)
      else if (on && vd < vf - 1e-9) set(ledOn, led.id, false)
    }
    for (const tmp of tmps) {
      const supply = v[node(`${tmp.id}:vs`)] - v[node(`${tmp.id}:gnd`)]
      if (!tmpOn.get(tmp.id) && supply > 2.7) set(tmpOn, tmp.id, true)
      else if (tmpOn.get(tmp.id) && supply < 2.4) set(tmpOn, tmp.id, false)
      if (!tmpReversed.get(tmp.id) && supply < -2) set(tmpReversed, tmp.id, true)
    }
    if (drivers.length) {
      const grounded = reach(n, stamps, [0])
      for (const d of drivers) {
        const g = node(`${d.id}:gnd`)
        const ok = grounded[g]
        const high = (name: string) => ok && grounded[node(`${d.id}:${name}`)] && v[node(`${d.id}:${name}`)] - v[g] > 2.5
        set(drive, d.id, { en: high('en'), dir: high('dir') ? 1 : 0, grounded: ok }, (a, b) => a.en === b.en && a.dir === b.dir && a.grounded === b.grounded)
      }
    }
    if (!changed) break
    stamps = build()
    v = solveLinear(n, stamps.map((s) => s.stamp))
  }
  return { v, stamps, ledOn, tmpOn, tmpReversed, drive }
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
  const seeds = [0, ...hi.stamps.filter(({ owner }) => owner === 'supply' || owner.startsWith('pin:')).map(({ stamp }) => stamp.a)]
  // A battery sets voltages too, but only relative to itself: count it only once it's tied to something driven.
  const driven = reach(n, hi.stamps, seeds)
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

  const volts = (ref: MicroRef) => netVolts[netOf[ref]]
  const pinsOn = (ref: MicroRef) => PIN_IDS.filter((p) => netOf[boardRef(p)] === netOf[ref])

  const tmps: BoardSolution['tmps'] = {}
  for (const t of circuit.parts.filter((p) => p.kind === 'tmp36')) {
    tmps[t.id] = { powered: !!hi.tmpOn.get(t.id), reversed: !!hi.tmpReversed.get(t.id) }
  }

  const servos: BoardSolution['servos'] = {}
  for (const sv of circuit.parts.filter((p) => p.kind === 'servo')) {
    const ok = volts(`${sv.id}:pwr`) - volts(`${sv.id}:gnd`) > 4
    // The signal is a pulse every 20 ms: 1 ms means 0°, 2 ms means 180°.
    const pin = pinsOn(`${sv.id}:sig`).find((p) => outputs[p] !== undefined)
    const ms = pin ? (outputs[pin] ?? 0) * 20 : 0
    const angle = ok && powered && ms >= 0.5 && ms <= 2.5 ? Math.min(180, Math.max(0, (ms - 1) * 180)) : null
    servos[sv.id] = { powered: ok && powered, angle }
  }

  const motors: BoardSolution['motors'] = {}
  for (const m of circuit.parts.filter((p) => p.kind === 'motor')) {
    const st = (s: StateSolve) => s.stamps.find((x) => x.owner === m.id)!.stamp
    const vm = volts(`${m.id}:a`) - volts(`${m.id}:b`)
    const amps = mix(Math.abs(current(st(hi), hi.v)), Math.abs(current(st(lo), lo.v)))
    const push = Math.max(0, Math.abs(vm) - BOARD.motorStartVolts) / (BOARD.motorFullVolts - BOARD.motorStartVolts)
    motors[m.id] = { volts: vm, current: amps, target: Math.sign(vm) * Math.min(1, push) }
  }

  const drivers: BoardSolution['drivers'] = {}
  for (const d of circuit.parts.filter((p) => p.kind === 'driver')) {
    const h = hi.drive.get(d.id)!
    const l = lo.drive.get(d.id)!
    drivers[d.id] = {
      grounded: h.grounded,
      powered: volts(`${d.id}:vm`) - volts(`${d.id}:gnd`) > 3 && !floating[netOf[`${d.id}:vm`]],
      enable: mix(h.en ? 1 : 0, l.en ? 1 : 0),
      dir: h.dir,
    }
  }

  const encoders: BoardSolution['encoders'] = {}
  for (const e of circuit.parts.filter((p) => p.kind === 'encoder')) {
    const ok = powered && volts(`${e.id}:vcc`) - volts(`${e.id}:gnd`) > 3
    encoders[e.id] = { powered: ok, pins: ok ? pinsOn(`${e.id}:out`) : [] }
  }

  return { powered, supplyCurrent: powered ? supplyCurrent : 0, netOf, netVolts, floating, pinVolts, pinFloating, pinCurrent, leds, tmps, servos, motors, drivers, encoders }
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

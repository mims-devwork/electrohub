import { ELECTRICAL, LED_SPECS, batteryInternalOhms, terminalsOf } from './parts'
import type { Circuit, PartResult, SimResult, TerminalRef } from './types'

/**
 * A tiny DC circuit solver using nodal analysis.
 *
 * Every terminal is a node. Wires are very small resistors (so we can tell how
 * much current flows along each individual wire and animate it). Batteries are
 * an ideal source with internal resistance, turned into their Norton
 * equivalent so the whole circuit is just conductances + injected currents.
 *
 * LEDs are modelled piecewise: "off" (almost no current) or "on" (a fixed
 * forward voltage plus a small series resistance). We guess each LED's state,
 * solve, check whether the guess was consistent, and repeat.
 */

const GMIN = 1e-9

interface Stamp {
  a: number
  b: number
  g: number
  /** Built-in source voltage pushing from b to a (a ends up higher). */
  src: number
}

export function simulate(circuit: Circuit): SimResult {
  const nodeIndex = new Map<TerminalRef, number>()
  const nodeOf = (ref: TerminalRef) => {
    let i = nodeIndex.get(ref)
    if (i === undefined) {
      i = nodeIndex.size
      nodeIndex.set(ref, i)
    }
    return i
  }

  // Ground = negative terminal of the first battery (so voltages read the way
  // a learner with a multimeter's black probe on battery − would see them).
  const firstBattery = circuit.parts.find((p) => p.kind === 'battery')
  if (firstBattery) nodeOf(terminalsOf(firstBattery)[1])
  for (const p of circuit.parts) terminalsOf(p).forEach(nodeOf)

  const partById = new Map(circuit.parts.map((p) => [p.id, p]))
  const validWires = circuit.wires.filter((w) => {
    const fromPart = w.from.slice(0, w.from.lastIndexOf(':'))
    const toPart = w.to.slice(0, w.to.lastIndexOf(':'))
    return partById.has(fromPart) && partById.has(toPart) && w.from !== w.to
  })

  const leds = circuit.parts.filter((p) => p.kind === 'led' && !p.props.burnt)
  const ledOn = new Map(leds.map((l) => [l.id, false]))

  const n = nodeIndex.size
  let v = new Float64Array(n)

  const buildStamps = () => {
    const stamps: { owner: string; stamp: Stamp }[] = []
    for (const p of circuit.parts) {
      const [ta, tb] = terminalsOf(p)
      const a = nodeOf(ta)
      const b = nodeOf(tb)
      switch (p.kind) {
        case 'battery': {
          const volts = p.props.voltage ?? 9
          stamps.push({ owner: p.id, stamp: { a, b, g: 1 / batteryInternalOhms(volts), src: volts } })
          break
        }
        case 'resistor':
          stamps.push({ owner: p.id, stamp: { a, b, g: 1 / Math.max(0.001, p.props.ohms ?? 470), src: 0 } })
          break
        case 'switch':
        case 'button':
          stamps.push({ owner: p.id, stamp: { a, b, g: p.props.closed ? 1 / ELECTRICAL.switchOhms : GMIN, src: 0 } })
          break
        case 'led': {
          if (p.props.burnt) {
            stamps.push({ owner: p.id, stamp: { a, b, g: GMIN, src: 0 } })
          } else if (ledOn.get(p.id)) {
            const vf = LED_SPECS[p.props.color ?? 'red'].vf
            stamps.push({ owner: p.id, stamp: { a, b, g: 1 / ELECTRICAL.ledSeriesOhms, src: vf } })
          } else {
            stamps.push({ owner: p.id, stamp: { a, b, g: GMIN, src: 0 } })
          }
          break
        }
      }
    }
    for (const w of validWires) {
      stamps.push({ owner: w.id, stamp: { a: nodeOf(w.from), b: nodeOf(w.to), g: 1 / ELECTRICAL.wireOhms, src: 0 } })
    }
    return stamps
  }

  const solveOnce = (stamps: { stamp: Stamp }[]) => {
    // G·v = i. Node 0 is ground (fixed at 0 V) so we solve for nodes 1..n-1.
    const m = n - 1
    if (m <= 0) return new Float64Array(n)
    const G = Array.from({ length: m }, () => new Float64Array(m))
    const I = new Float64Array(m)
    for (let k = 0; k < m; k++) G[k][k] += GMIN
    for (const { stamp } of stamps) {
      const { a, b, g, src } = stamp
      const ia = a - 1
      const ib = b - 1
      if (ia >= 0) G[ia][ia] += g
      if (ib >= 0) G[ib][ib] += g
      if (ia >= 0 && ib >= 0) {
        G[ia][ib] -= g
        G[ib][ia] -= g
      }
      // Element current leaving `a` = g(Va - Vb) - g·src → move constant to RHS.
      if (src !== 0) {
        if (ia >= 0) I[ia] += g * src
        if (ib >= 0) I[ib] -= g * src
      }
    }
    const x = gaussianSolve(G, I)
    const out = new Float64Array(n)
    for (let k = 0; k < m; k++) out[k + 1] = x[k]
    return out
  }

  let stamps = buildStamps()
  for (let iter = 0; iter < 40; iter++) {
    stamps = buildStamps()
    v = solveOnce(stamps)
    let changed = false
    for (const led of leds) {
      const [ta, tb] = terminalsOf(led)
      const vd = v[nodeOf(ta)] - v[nodeOf(tb)]
      const vf = LED_SPECS[led.props.color ?? 'red'].vf
      const on = ledOn.get(led.id)!
      if (!on && vd > vf + 1e-6) {
        ledOn.set(led.id, true)
        changed = true
      } else if (on && (vd - vf) / ELECTRICAL.ledSeriesOhms < -1e-9) {
        ledOn.set(led.id, false)
        changed = true
      }
    }
    if (!changed) break
  }

  const terminalVoltage: Record<TerminalRef, number> = {}
  for (const [ref, i] of nodeIndex) terminalVoltage[ref] = v[i]

  const elementCurrent = (s: Stamp) => s.g * (v[s.a] - v[s.b]) - s.g * s.src

  const parts: Record<string, PartResult> = {}
  for (const p of circuit.parts) {
    const [ta, tb] = terminalsOf(p)
    const voltage = v[nodeOf(ta)] - v[nodeOf(tb)]
    const stamp = stamps.find((s) => s.owner === p.id)!.stamp
    let current = elementCurrent(stamp)
    if (Math.abs(current) < 1e-7) current = 0
    const result: PartResult = { current, voltage, power: Math.abs(current * voltage) }
    if (p.kind === 'battery') {
      // For a battery, report the current it pushes out of its + terminal.
      // Internally the current flows from − to +, i.e. b → a, so flip sign.
      result.current = -current
      result.power = Math.abs(current) * (p.props.voltage ?? 9)
    }
    if (p.kind === 'led') {
      const state = p.props.burnt ? 'burnt' : ledOn.get(p.id) && current > 1e-6 ? 'on' : 'off'
      result.ledState = state
      result.brightness = state === 'on' ? Math.min(1, Math.sqrt(current / ELECTRICAL.ledRated)) : 0
      result.overload = state === 'on' && current > ELECTRICAL.ledBurn
    }
    parts[p.id] = result
  }

  const wires: Record<string, number> = {}
  for (const s of stamps) {
    if (!partById.has(s.owner)) {
      const c = elementCurrent(s.stamp)
      wires[s.owner] = Math.abs(c) < 1e-7 ? 0 : c
    }
  }

  const connected = new Set<TerminalRef>()
  for (const w of validWires) {
    connected.add(w.from)
    connected.add(w.to)
  }
  const dangling = circuit.parts.flatMap((p) => terminalsOf(p)).filter((t) => !connected.has(t))

  return { terminalVoltage, parts, wires, dangling }
}

/** Gaussian elimination with partial pivoting. Mutates its inputs. */
function gaussianSolve(A: Float64Array[], b: Float64Array): Float64Array {
  const n = b.length
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    if (pivot !== col) {
      ;[A[col], A[pivot]] = [A[pivot], A[col]]
      ;[b[col], b[pivot]] = [b[pivot], b[col]]
    }
    const d = A[col][col]
    if (Math.abs(d) < 1e-30) continue
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / d
      if (f === 0) continue
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c]
      b[r] -= f * b[col]
    }
  }
  const x = new Float64Array(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let c = r + 1; c < n; c++) s -= A[r][c] * x[c]
    x[r] = Math.abs(A[r][r]) < 1e-30 ? 0 : s / A[r][r]
  }
  return x
}

import { ELECTRICAL, LED_SPECS, formatAmps, formatOhms, formatVolts, formatWatts, parseRef, terminalsOf } from './parts'
import type { Circuit, SimResult } from './types'

export type Severity = 'danger' | 'warning' | 'info' | 'success'

/**
 * A friendly explanation of something that happened in the circuit.
 * Always structured as: what happened → why it happened → how to fix it.
 */
export interface Issue {
  id: string
  severity: Severity
  /** Parts or wires to highlight on the canvas. */
  highlight: string[]
  title: string
  what: string
  why: string
  fix?: string
}

function hasLimitingResistor(circuit: Circuit, sim: SimResult) {
  return circuit.parts.some((p) => p.kind === 'resistor' && Math.abs(sim.parts[p.id]?.current ?? 0) > 1e-4)
}

const SEVERITY_ORDER: Record<Severity, number> = { danger: 0, warning: 1, info: 2, success: 3 }

export function diagnose(circuit: Circuit, sim: SimResult): Issue[] {
  const issues: Issue[] = []
  const batteries = circuit.parts.filter((p) => p.kind === 'battery')
  const leds = circuit.parts.filter((p) => p.kind === 'led')

  if (circuit.parts.length > 0 && batteries.length === 0) {
    issues.push({
      id: 'no-battery',
      severity: 'info',
      highlight: [],
      title: 'Nothing is pushing the electricity',
      what: 'There is no battery on the bench.',
      why: 'Wires and parts on their own don’t make electricity move. Something has to push it, and that’s the battery’s job.',
      fix: 'Drag a battery from the parts tray onto the bench.',
    })
  }

  // Short circuit: a battery dumping huge current through (almost) nothing.
  for (const b of batteries) {
    const r = sim.parts[b.id]
    if (Math.abs(r.current) > ELECTRICAL.shortCircuit) {
      const hottest = Object.entries(sim.wires)
        .filter(([, i]) => Math.abs(i) > ELECTRICAL.shortCircuit * 0.5)
        .map(([id]) => id)
      issues.push({
        id: `short-${b.id}`,
        severity: 'danger',
        highlight: [b.id, ...hottest],
        title: 'Short circuit!',
        what: `The battery’s + and − are joined by a path with almost nothing in it. About ${formatAmps(r.current)} is rushing round, and the wires and battery would get hot quickly.`,
        why: 'Electricity always takes the easiest path. A bare wire from + back to − is so easy that the battery empties itself as fast as it can.',
        fix: 'Find the wire that gives the current a shortcut back to the battery and remove it. On its way round, the current should have to pass through a part like a resistor or an LED.',
      })
    }
  }

  for (const led of leds) {
    const r = sim.parts[led.id]
    const spec = LED_SPECS[led.props.color ?? 'red']
    const [anode, cathode] = terminalsOf(led)
    if (led.props.burnt) {
      issues.push({
        id: `burnt-${led.id}`,
        severity: 'danger',
        highlight: [led.id],
        title: 'The LED burned out',
        what: led.props.burntAt
          ? `About ${formatAmps(led.props.burntAt)} tried to flow through the LED. An LED is only comfortable with around 10–20 mA.`
          : 'Too much current flowed through the LED and it overheated.',
        why: 'An LED can’t limit its own current. Once it turns on, it lets through almost as much as the battery can push, so it cooks itself in a fraction of a second.',
        fix: 'Select the LED and press “Replace LED”. Then add a resistor to the same loop so it can limit the current.',
      })
      continue
    }
    if (r.ledState === 'on' && r.current > ELECTRICAL.ledWarn) {
      issues.push({
        id: `hot-${led.id}`,
        severity: 'warning',
        highlight: [led.id],
        title: 'The LED is being pushed too hard',
        what: `${formatAmps(r.current)} is flowing through the LED. It’s very bright, but that’s more than it’s designed for (about 20 mA).`,
        why: 'More current means more heat. It might survive for a while, but it will wear out early or fail suddenly.',
        fix: hasLimitingResistor(circuit, sim)
          ? 'Swap in a bigger resistor, like the next value up, to bring the current down.'
          : 'Add a resistor to the same loop as the LED to limit the current.',
      })
    }
    const reverse = sim.terminalVoltage[cathode] - sim.terminalVoltage[anode]
    if (r.ledState === 'off' && reverse > 0.5) {
      issues.push({
        id: `reversed-${led.id}`,
        severity: 'warning',
        highlight: [led.id],
        title: 'The LED is facing the wrong way',
        what: 'The LED is getting voltage, but it’s backwards, so it stays dark.',
        why: 'LED stands for light-emitting diode, and a diode is a one-way door for electricity. Current can only go in through the long leg (+, the anode) and out through the short leg (−, the cathode).',
        fix: 'Select the LED and press “Flip”. Its + leg should face the battery’s + side.',
      })
    }
    const forward = sim.terminalVoltage[anode] - sim.terminalVoltage[cathode]
    const maxBattery = Math.max(0, ...batteries.map((b) => b.props.voltage ?? 0))
    if (r.ledState === 'off' && forward > 0.3 && maxBattery < spec.vf) {
      issues.push({
        id: `weak-${led.id}`,
        severity: 'info',
        highlight: [led.id],
        title: 'Not enough push to light the LED',
        what: `A ${spec.label.toLowerCase()} LED needs about ${spec.vf.toFixed(1)} V before it lights at all, and your battery only gives ${formatVolts(maxBattery)}.`,
        why: 'An LED stays dark until the voltage across it passes its turn-on voltage (also called the forward voltage). Below that, almost no current gets through.',
        fix: 'Select the battery and choose a higher voltage.',
      })
    }
  }

  for (const res of circuit.parts.filter((p) => p.kind === 'resistor')) {
    const r = sim.parts[res.id]
    if (r.power > ELECTRICAL.resistorWatts) {
      issues.push({
        id: `resistor-hot-${res.id}`,
        severity: 'warning',
        highlight: [res.id],
        title: 'This resistor is getting hot',
        what: `The ${formatOhms(res.props.ohms ?? 0)} resistor is turning ${formatWatts(r.power)} into heat. A small hobby resistor can only handle about 250 mW.`,
        why: 'A resistor slows the current down by turning some of the energy into heat. The more current flows through it, the more heat it makes.',
        fix: 'Use a bigger resistance, or make sure the resistor isn’t connected straight across the battery.',
      })
    }
  }

  // Open switches that are the "gap" in an otherwise complete loop.
  for (const sw of circuit.parts.filter((p) => p.kind === 'switch' || p.kind === 'button')) {
    const r = sim.parts[sw.id]
    if (!sw.props.closed && Math.abs(r.voltage) > 0.3) {
      const isButton = sw.kind === 'button'
      issues.push({
        id: `open-${sw.id}`,
        severity: 'info',
        highlight: [sw.id],
        title: isButton ? 'The button isn’t pressed' : 'The switch is off',
        what: `The ${isButton ? 'button' : 'switch'} is open, so there’s a gap in the loop and nothing flows.`,
        why: `Notice there are ${formatVolts(Math.abs(r.voltage))} across the gap. The battery is still pushing, but the current has no way through.`,
        fix: isButton ? 'Press and hold the button.' : 'Click the switch to close it.',
      })
    }
  }

  // An open loop: battery present, no current anywhere.
  const anyCurrent = batteries.some((b) => Math.abs(sim.parts[b.id].current) > 1e-6)
  const hasOpenSwitchGap = issues.some((i) => i.id.startsWith('open-'))
  const hasBurnt = leds.some((l) => l.props.burnt)
  if (batteries.length > 0 && !anyCurrent && !hasOpenSwitchGap && !hasBurnt && circuit.parts.length > 1) {
    const danglingParts = [...new Set(sim.dangling.map((t) => parseRef(t).partId))]
    issues.push({
      id: 'open-loop',
      severity: 'info',
      highlight: danglingParts,
      title: 'The loop isn’t closed yet',
      what: 'No current is flowing anywhere.',
      why: 'Electricity needs a complete loop: out of the battery’s +, through your parts, and back into the battery’s −. One gap anywhere stops the whole flow.',
      fix: danglingParts.length
        ? 'Look for legs that aren’t connected yet (the blinking circles) and wire them up so the loop is complete.'
        : 'Follow the path from + with your finger. Every part should lead on to the next, all the way back to −.',
    })
  }

  for (const led of leds) {
    const r = sim.parts[led.id]
    if (r.ledState === 'on' && r.current <= ELECTRICAL.ledWarn) {
      issues.push({
        id: `lit-${led.id}`,
        severity: 'success',
        highlight: [led.id],
        title: 'Your LED is glowing safely',
        what: `${formatAmps(r.current)} is flowing through the LED, which is comfortably inside its safe range.`,
        why: 'The loop is complete, the LED faces the right way, and something in the loop is limiting the current.',
      })
    }
  }

  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

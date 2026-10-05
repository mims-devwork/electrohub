import type { Issue, Severity } from '../sim/diagnose'
import { formatAmps } from '../sim/parts'
import { BOARD, PIN_BY_ID, boardRef } from './board'
import { pinsOnNet } from './engine'
import { potControls } from './goals'
import { PROGRAMS } from './programs'
import type { Frame } from './runtime'
import type { BoardPin, MicroCircuit, MicroInputs, ProgramId } from './types'

const SEVERITY_ORDER: Record<Severity, number> = { danger: 0, warning: 1, info: 2, success: 3 }

const pinName = (pin: BoardPin) => (pin === 'GND2' ? 'GND' : pin)

/** Lab notes for the Microcontroller bench: what happened → why → how to fix it. */
export function diagnoseMicro(
  circuit: MicroCircuit,
  inputs: MicroInputs,
  frame: Frame,
  program: ProgramId,
  slots: Record<string, string>,
): Issue[] {
  const issues: Issue[] = []
  const { sol } = frame
  const def = PROGRAMS[program]
  const outputs = def.outputs(slots)

  if (!sol.powered) {
    issues.push({
      id: 'board-short',
      severity: 'danger',
      highlight: [boardRef('5V'), boardRef('GND')],
      title: 'The board switched itself off',
      what: '5V is joined to GND with almost nothing in between. A huge current tried to flow, so the board’s protection fuse cut the power.',
      why: 'It’s a short circuit, just like a bare wire across a battery in the Circuit Lab. The fuse is there to save the board (and the USB port it’s plugged into).',
      fix: 'Find the path from 5V (red) to GND that has no part in it, such as a wire, a pressed button, or the knob turned to one end with both legs on the same side, and remove it. The board turns back on by itself.',
    })
    return issues
  }

  for (const [pin, amps] of Object.entries(sol.pinCurrent) as [BoardPin, number][]) {
    if (amps > BOARD.pinMax) {
      issues.push({
        id: `pin-overload-${pin}`,
        severity: 'danger',
        highlight: [boardRef(pin)],
        title: `Pin ${pinName(pin)} is overloaded`,
        what: `The program drives ${pinName(pin)}, and it’s trying to push ${formatAmps(amps)}. A pin is happy with about 20 mA, and 40 mA is its absolute limit.`,
        why: 'An output pin is a tiny switchable 5 V supply. Wired straight to GND or 5V, it fights the other side and the chip inside heats up. Real pins get damaged like this.',
        fix: `Never connect an output pin straight to 5V or GND. Put a part with resistance, like the LED module, between ${pinName(pin)} and GND.`,
      })
    }
  }

  // Inputs the program reads that nothing is driving. A pin hanging off a button
  // always gets a note; otherwise we only nag while none of the inputs are wired up.
  const anyInputDriven = def.reads.some((pin) => !sol.pinFloating[pin])
  for (const pin of def.reads) {
    if (!sol.pinFloating[pin]) continue
    const onNet = circuit.parts.flatMap((p) => (p.kind === 'button' ? [`${p.id}:a`, `${p.id}:b`] : [])).filter((t) => sol.netOf[t] === sol.netOf[boardRef(pin)])
    const viaButton = onNet.length > 0
    if (!viaButton && (anyInputDriven || pin !== def.reads[0])) continue
    issues.push({
      id: `floating-${pin}`,
      severity: viaButton ? 'warning' : 'info',
      highlight: [boardRef(pin)],
      title: viaButton ? `${pin} is floating while the button is up` : `${pin} isn’t connected to anything`,
      what: viaButton
        ? `When the button is pressed, ${pin} is joined to 5V and reads HIGH. When it’s released, ${pin} is connected to nothing at all, so its reading wanders randomly.`
        : `The program reads ${pin}, but nothing sets its voltage, so the number it gets back is random noise.`,
      why: 'An input pin draws almost no current. Left on its own it picks up stray electrical noise from nearby wires, even from your hand. Engineers call this a floating input.',
      fix: viaButton
        ? `Give ${pin} a gentle default: add a 10 kΩ resistor from ${pin} to GND (a pull-down). Released, it reads LOW. Pressed, the button wins and it reads HIGH.`
        : pin === 'A0'
          ? 'Wire the potentiometer’s middle leg (W) to A0, and its outer legs to 5V and GND.'
          : `Connect ${pin} to something that sets its voltage.`,
    })
  }

  // Potentiometers that are only partly wired.
  for (const pot of circuit.parts.filter((p) => p.kind === 'pot')) {
    const ends = [`${pot.id}:a`, `${pot.id}:b`].map((t) => pinsOnNet(sol, t))
    const wiperPins = pinsOnNet(sol, `${pot.id}:w`)
    const endsOk = ends.some((e) => e.includes('5V')) && ends.some((e) => e.some((p) => p === 'GND' || p === 'GND2'))
    const wiperOnInput = wiperPins.some((p) => def.reads.includes(p))
    if (wiperOnInput && !endsOk) {
      issues.push({
        id: `pot-ends-${pot.id}`,
        severity: 'info',
        highlight: [pot.id],
        title: 'The knob has nothing to divide',
        what: 'The wiper is connected, but the two outer legs aren’t across 5V and GND, so turning the knob can’t sweep the voltage from 0 to 5 V.',
        why: 'A potentiometer is a voltage divider. Its track needs the full 5 V across it, one end at 5V and the other at GND, so the wiper can pick off any voltage in between.',
        fix: 'Wire one outer leg (1) to 5V and the other outer leg (3) to GND.',
      })
    } else if (endsOk && !wiperOnInput && wiperPins.length === 0) {
      issues.push({
        id: `pot-wiper-${pot.id}`,
        severity: 'info',
        highlight: [pot.id],
        title: 'The middle leg is the one that moves',
        what: 'The outer legs are across 5V and GND, but nothing reads the wiper (W), so the board never sees the knob.',
        why: 'The outer legs are the two ends of the track, and the voltage between them never changes. Only the wiper slides along the track as you turn.',
        fix: `Wire the middle leg (W) to ${def.reads[0] ?? 'an input pin'}.`,
      })
    }
  }

  for (const led of circuit.parts.filter((p) => p.kind === 'led')) {
    const r = sol.leds[led.id]
    if (r?.reversed) {
      issues.push({
        id: `led-reversed-${led.id}`,
        severity: 'warning',
        highlight: [led.id],
        title: 'The LED is facing the wrong way',
        what: 'The LED module has voltage across it, but it’s backwards, so it stays dark.',
        why: 'An LED is a one-way door. Current has to go in at + and out at −.',
        fix: 'Swap its two wires: + goes to the output pin, − goes to GND.',
      })
    }
    // Wired to a pin the program never drives.
    const pins = pinsOnNet(sol, `${led.id}:anode`).filter((p) => p.startsWith('D'))
    const notDriven = pins.filter((p) => !outputs.includes(p))
    if (pins.length && notDriven.length === pins.length && outputs.length) {
      const wired = notDriven[0]
      issues.push({
        id: `led-pin-${led.id}`,
        severity: 'info',
        highlight: [led.id, boardRef(wired)],
        title: 'The code and the wires don’t agree',
        what: `The LED is wired to ${wired}, but the program writes to ${outputs.map(pinName).join(' and ')}. Nothing ever switches ${wired} on.`,
        why: 'The board can’t see your wires. It does exactly what the code says, to exactly the pins the code names.',
        fix: `Change the pin number in the code to ${wired.slice(1)}, or move the LED’s wire to ${outputs.map(pinName).join(' / ')}.`,
      })
    }
  }

  // A knob on a digital pin is a teachable moment.
  if (def.reads.includes('D2') && potControls(circuit, inputs, frame, 'D2')) {
    issues.push({
      id: 'pot-on-digital',
      severity: 'success',
      highlight: [boardRef('D2')],
      title: 'A smooth voltage on a digital pin',
      what: `D2 is at ${sol.pinVolts.D2.toFixed(2)} V, but digitalRead can only answer 0 or 1.`,
      why: `Below ${BOARD.lowMax} V it’s always 0 and above ${BOARD.highMin} V it’s always 1. In between, the answer isn’t guaranteed, so it can flicker.`,
    })
  }

  for (const pin of def.reads) {
    if (pin.startsWith('A') && !sol.pinFloating[pin] && frame.reads[pin] !== undefined) {
      const v = sol.pinVolts[pin]
      issues.push({
        id: `reading-${pin}`,
        severity: 'success',
        highlight: [],
        title: `${PIN_BY_ID[pin].label} is reading a real voltage`,
        what: `${v.toFixed(2)} V on ${pin} → analogRead gives ${frame.reads[pin]}. That’s ${v.toFixed(2)} ÷ 5 × 1023.`,
        why: 'The analog-to-digital converter inside the chip compares the pin’s voltage with 5 V and turns it into a number from 0 to 1023.',
      })
    }
  }

  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

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

  // A motor hanging straight off the 5V pin trips the board's fuse too.
  const hungry = circuit.parts.filter((p) => p.kind === 'motor' && [`${p.id}:a`, `${p.id}:b`].some((t) => pinsOnNet(sol, t).includes('5V')))
  if (!sol.powered && hungry.length) {
    issues.push({
      id: 'board-short',
      severity: 'danger',
      highlight: [boardRef('5V'), ...hungry.map((p) => p.id)],
      title: 'The motor is too hungry for the board',
      what: 'The motor is wired straight across the board’s 5V and GND. It tried to pull nearly an amp, so the board’s protection fuse cut the power.',
      why: 'A USB port gives about half an amp in total, and the board needs some of that itself. Motors need their own battery.',
      fix: 'Power the motor from the battery pack through a motor driver: battery + to VM, and the driver’s outputs to the motor.',
    })
    return issues
  }
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
        : pin === 'A0' && circuit.parts.some((p) => p.kind === 'tmp36')
          ? 'Wire the sensor’s OUT leg to A0, its + leg to 5V and its − leg to GND.'
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

  // ——— robot parts ———
  for (const tmp of circuit.parts.filter((p) => p.kind === 'tmp36')) {
    const t = sol.tmps[tmp.id]
    if (t?.reversed) {
      issues.push({
        id: `tmp-reversed-${tmp.id}`,
        severity: 'danger',
        highlight: [tmp.id],
        title: 'The sensor is in backwards, and getting hot',
        what: 'Its + leg is at 0 V and its − leg is at 5 V. Current is pouring through it the wrong way.',
        why: 'Inside every chip are protection diodes, one-way doors that normally sit idle. Powered backwards, they let a big current through, and a real TMP36 gets hot enough to burn a fingertip.',
        fix: 'Swap the wires on the outer legs: + to 5V, − to GND. Hold the sensor with its flat face towards you: the legs are +, OUT, − from left to right.',
      })
    } else if (!t?.powered && pinsOnNet(sol, `${tmp.id}:out`).length) {
      issues.push({
        id: `tmp-unpowered-${tmp.id}`,
        severity: 'info',
        highlight: [tmp.id],
        title: 'The sensor has no power',
        what: 'Its OUT leg is wired up, but there’s no 5 V across its + and − legs, so it isn’t measuring anything.',
        why: 'A sensor like this is a small circuit of its own. It needs power before it can produce a voltage that means something.',
        fix: 'Wire the + leg to 5V and the − leg to GND.',
      })
    }
  }

  for (const m of circuit.parts.filter((p) => p.kind === 'motor')) {
    const onPin = [`${m.id}:a`, `${m.id}:b`].flatMap((t) => pinsOnNet(sol, t)).filter((p) => p.startsWith('D'))
    if (onPin.length) {
      issues.push({
        id: `motor-on-pin-${m.id}`,
        severity: 'warning',
        highlight: [m.id, ...onPin.map(boardRef)],
        title: 'A pin can’t run a motor',
        what: `The motor is wired straight to ${onPin.map(pinName).join(' and ')}. It gets ${Math.abs(sol.motors[m.id]?.volts ?? 0).toFixed(1)} V and ${formatAmps(sol.motors[m.id]?.current ?? 0)}, so it barely twitches while the pin overheats.`,
        why: 'A motor needs hundreds of milliamps. A pin is built for about 20 mA, and its own internal resistance eats most of the voltage when you ask for more.',
        fix: 'Let the pin give orders instead of power: wire it to a motor driver’s EN input, and power the motor from a battery through the driver.',
      })
    }
  }

  for (const d of circuit.parts.filter((p) => p.kind === 'driver')) {
    const r = sol.drivers[d.id]
    const ordered = ['en', 'dir'].some((t) => pinsOnNet(sol, `${d.id}:${t}`).some((p) => outputs.includes(p)))
    if (ordered && !r?.grounded) {
      issues.push({
        id: `driver-ground-${d.id}`,
        severity: 'warning',
        highlight: [d.id],
        title: 'No common ground',
        what: 'The board is sending signals to EN and DIR, but the driver’s GND isn’t connected to the board’s GND, so it ignores them.',
        why: 'A voltage is always a difference between two points. “5 V on EN” only means something if the driver and the board agree where 0 V is, and that takes a shared GND wire.',
        fix: 'Wire the driver’s GND to the board’s GND, and the battery − to that same GND.',
      })
    } else if (ordered && !r?.powered) {
      issues.push({
        id: `driver-power-${d.id}`,
        severity: 'info',
        highlight: [d.id],
        title: 'The driver has no motor power',
        what: 'The driver is getting its orders, but nothing is connected to VM, so it has no power to pass on to the motor.',
        why: 'The driver doesn’t make power. It’s a set of switches that connect the motor to a battery, the right way round, when the board says so.',
        fix: 'Wire the battery + to VM, and the battery − to GND.',
      })
    }
  }

  for (const b of circuit.parts.filter((p) => p.kind === 'battery')) {
    // How far the battery's voltage has sagged tells us how much current it's pushing.
    const v = sol.netVolts[sol.netOf[`${b.id}:pos`]] - sol.netVolts[sol.netOf[`${b.id}:neg`]]
    const amps = ((b.props.voltage ?? BOARD.batteryVolts) - v) / BOARD.batteryOhms
    if (amps > 3) {
      issues.push({
        id: `battery-short-${b.id}`,
        severity: 'danger',
        highlight: [b.id],
        title: 'The battery is short-circuited',
        what: `Its + and − are joined with almost nothing in between. About ${amps.toFixed(0)} A is flowing, and the wires would heat up fast.`,
        why: 'Batteries can push far more current than a USB port. This is exactly why robots have a fuse in the battery lead.',
        fix: 'Remove the wire joining + to −. The current should only flow through the driver and motor.',
      })
    }
  }

  for (const sv of circuit.parts.filter((p) => p.kind === 'servo')) {
    const r = sol.servos[sv.id]
    const sigPins = pinsOnNet(sol, `${sv.id}:sig`)
    if (!r?.powered && sigPins.length) {
      issues.push({
        id: `servo-power-${sv.id}`,
        severity: 'info',
        highlight: [sv.id],
        title: 'The servo has no power',
        what: 'Its signal wire is connected, but its red and brown wires aren’t across 5V and GND.',
        why: 'The signal only says where to point. The servo’s own motor needs power from the red (+) and brown (−) wires to get there.',
        fix: 'Red to 5V, brown to GND.',
      })
    } else if (r?.powered && r.angle === null) {
      issues.push({
        id: `servo-signal-${sv.id}`,
        severity: 'info',
        highlight: [sv.id],
        title: 'The servo is waiting for orders',
        what: sigPins.length ? `Its signal wire is on ${sigPins.map(pinName).join(', ')}, but the program sends its pulses on pin 9.` : 'It has power, but its orange signal wire isn’t connected to the board.',
        why: 'A servo holds still until it gets a pulse every 20 ms. The length of each pulse, between 1 and 2 ms, is the angle.',
        fix: 'Wire the orange signal wire to ~D9.',
      })
    }
  }

  for (const e of circuit.parts.filter((p) => p.kind === 'encoder')) {
    const r = sol.encoders[e.id]
    const outPins = pinsOnNet(sol, `${e.id}:out`)
    if (outPins.length && !r?.powered) {
      issues.push({
        id: `encoder-power-${e.id}`,
        severity: 'info',
        highlight: [e.id],
        title: 'The encoder has no power',
        what: 'Its OUT leg is wired, but its + and − aren’t across 5V and GND, so its light sensor is dark.',
        why: 'An encoder shines a tiny light through the slots in the wheel. No power, no light, no pulses.',
        fix: 'Wire + to 5V and − to GND.',
      })
    } else if (r?.powered && outPins.length && !outPins.includes('D2')) {
      issues.push({
        id: `encoder-pin-${e.id}`,
        severity: 'info',
        highlight: [e.id],
        title: 'That pin can’t count pulses',
        what: `The encoder’s pulses go to ${outPins.map(pinName).join(', ')}, but the program counts them on pin 2.`,
        why: 'Pulses arrive faster than loop() can check for them, so the program uses an interrupt: the chip drops what it’s doing for an instant on every pulse. On an Uno only pins 2 and 3 can do that.',
        fix: 'Move the encoder’s OUT wire to D2.',
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

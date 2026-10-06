import type { BoardPin, MicroPart, MicroPartKind, MicroRef } from './types'

export interface PinDef {
  pin: BoardPin
  /** Label printed on the board. */
  label: string
  /** Plain-language description used in hovers and the pin finder. */
  hint: string
  color: string
  /** Can this pin do PWM (marked ~ on real boards)? */
  pwm?: boolean
  analog?: boolean
}

/** Header pins, top to bottom, as drawn on the bench. */
export const BOARD_PINS: PinDef[] = [
  { pin: '5V', label: '5V', hint: '5V: a steady 5 V supply from the board. Use it to power sensors and knobs.', color: '#ef4444' },
  { pin: 'GND', label: 'GND', hint: 'GND: ground, the board’s 0 V. Every circuit needs a way back here.', color: '#64748b' },
  { pin: 'A0', label: 'A0', hint: 'A0: analog input. It measures any voltage from 0 to 5 V as a number from 0 to 1023.', color: '#fbbf24', analog: true },
  { pin: 'D2', label: 'D2', hint: 'D2: digital pin. As an input it only answers HIGH (1) or LOW (0).', color: '#38bdf8' },
  { pin: 'D9', label: '~D9', hint: 'D9: digital pin with PWM (~). It can fake in-between levels by switching very fast.', color: '#a78bfa', pwm: true },
  { pin: 'D13', label: 'D13', hint: 'D13: digital pin. The little “L” LED on the board is wired to it too.', color: '#34d399' },
  { pin: 'GND2', label: 'GND', hint: 'GND: another ground pin. All GND pins are joined inside the board.', color: '#64748b' },
]

export const PIN_BY_ID = Object.fromEntries(BOARD_PINS.map((p) => [p.pin, p])) as Record<BoardPin, PinDef>

export const boardRef = (pin: BoardPin): MicroRef => `board:${pin}`

export function parseMicroRef(ref: MicroRef): { partId: string; terminal: string } {
  const i = ref.lastIndexOf(':')
  return { partId: ref.slice(0, i), terminal: ref.slice(i + 1) }
}

export interface MicroTerminalDef {
  name: string
  dx: number
  dy: number
  label: string
  hint: string
}

export const MICRO_PART_DEFS: Record<MicroPartKind, { name: string; terminals: MicroTerminalDef[]; catalogId: string }> = {
  pot: {
    name: 'Potentiometer',
    catalogId: 'potentiometer',
    terminals: [
      { name: 'a', dx: -64, dy: -26, label: '1', hint: 'Outer leg 1: one end of the resistor track.' },
      { name: 'w', dx: -64, dy: 0, label: 'W', hint: 'Middle leg: the wiper, which slides along the track as you turn the knob.' },
      { name: 'b', dx: -64, dy: 26, label: '3', hint: 'Outer leg 3: the other end of the resistor track.' },
    ],
  },
  button: {
    name: 'Push button',
    catalogId: 'button',
    terminals: [
      { name: 'a', dx: -40, dy: 0, label: '', hint: 'Button contact.' },
      { name: 'b', dx: 40, dy: 0, label: '', hint: 'Button contact.' },
    ],
  },
  led: {
    name: 'LED + 220 Ω',
    catalogId: 'led',
    terminals: [
      { name: 'anode', dx: -78, dy: -12, label: '+', hint: 'The + end: through the built-in 220 Ω resistor to the LED’s long leg.' },
      { name: 'cathode', dx: -78, dy: 18, label: '−', hint: 'The − end: the LED’s short leg. Connect it towards GND.' },
    ],
  },
  resistor: {
    name: 'Resistor',
    catalogId: 'resistor',
    terminals: [
      { name: 'a', dx: -52, dy: 0, label: '', hint: 'Resistor leg. Resistors work the same in either direction.' },
      { name: 'b', dx: 52, dy: 0, label: '', hint: 'Resistor leg. Resistors work the same in either direction.' },
    ],
  },
  tmp36: {
    name: 'Temperature sensor',
    catalogId: 'temp-sensor',
    terminals: [
      { name: 'vs', dx: -48, dy: -26, label: '+', hint: 'The + leg (+Vs): power for the sensor. Connect it to 5V.' },
      { name: 'out', dx: -48, dy: 0, label: 'OUT', hint: 'Vout: 0.5 V at 0 °C, rising 10 mV for every degree. Connect it to an analog pin.' },
      { name: 'gnd', dx: -48, dy: 26, label: '−', hint: 'The − leg: connect it to GND.' },
    ],
  },
  servo: {
    name: 'Servo',
    catalogId: 'servo',
    terminals: [
      { name: 'gnd', dx: -70, dy: -26, label: '−', hint: 'Brown wire: ground. Connect it to GND.' },
      { name: 'pwr', dx: -70, dy: 0, label: '+', hint: 'Red wire: power for the servo’s motor. Connect it to 5V.' },
      { name: 'sig', dx: -70, dy: 26, label: 'SIG', hint: 'Orange wire: the signal. Pulses on this wire tell the servo which angle to point at.' },
    ],
  },
  motor: {
    name: 'DC motor',
    catalogId: 'dc-motor',
    terminals: [
      { name: 'a', dx: -62, dy: -14, label: '', hint: 'Motor terminal. Swap the two wires and the motor spins the other way.' },
      { name: 'b', dx: -62, dy: 14, label: '', hint: 'Motor terminal. Swap the two wires and the motor spins the other way.' },
    ],
  },
  driver: {
    name: 'Motor driver',
    catalogId: 'motor-driver',
    terminals: [
      { name: 'en', dx: -76, dy: -42, label: 'EN', hint: 'EN (enable): HIGH lets power through to the motor. PWM here sets the speed.' },
      { name: 'dir', dx: -76, dy: -14, label: 'DIR', hint: 'DIR (direction): LOW spins the motor one way, HIGH the other way.' },
      { name: 'gnd', dx: -76, dy: 14, label: 'GND', hint: 'GND: shared by the board, the driver and the battery −. Without it, EN and DIR mean nothing.' },
      { name: 'vm', dx: -76, dy: 42, label: 'VM', hint: 'VM (motor power): the battery + goes here. The motor’s big current comes from this pin, not from the board.' },
      { name: 'oa', dx: 76, dy: -16, label: 'A', hint: 'Motor output A. Connect it to one motor terminal.' },
      { name: 'ob', dx: 76, dy: 16, label: 'B', hint: 'Motor output B. Connect it to the other motor terminal.' },
    ],
  },
  battery: {
    name: 'Battery pack',
    catalogId: 'battery',
    terminals: [
      { name: 'pos', dx: -82, dy: -12, label: '+', hint: 'Battery +: power for the motors. Connect it to the driver’s VM.' },
      { name: 'neg', dx: -82, dy: 12, label: '−', hint: 'Battery −: connect it to GND, so the battery, driver and board share one 0 V.' },
    ],
  },
  encoder: {
    name: 'Wheel encoder',
    catalogId: 'dc-motor',
    terminals: [
      { name: 'vcc', dx: -54, dy: -26, label: '+', hint: 'Power for the encoder’s light sensor. Connect it to 5V.' },
      { name: 'gnd', dx: -54, dy: 0, label: '−', hint: 'Encoder ground. Connect it to GND.' },
      { name: 'out', dx: -54, dy: 26, label: 'OUT', hint: 'One pulse every time a slot in the wheel passes the sensor. Connect it to D2, which can count pulses.' },
    ],
  },
}

export function microTerminals(part: MicroPart): MicroRef[] {
  return MICRO_PART_DEFS[part.kind].terminals.map((t) => `${part.id}:${t.name}`)
}

/** Electrical constants for the board. Tuned to an Arduino Uno–style 5 V board. */
export const BOARD = {
  volts: 5,
  /** Highest number analogRead() returns (10-bit). */
  adcMax: 1023,
  /** Below this a digital input is guaranteed to read LOW (0.3 × 5 V). */
  lowMax: 1.5,
  /** Above this a digital input is guaranteed to read HIGH (0.6 × 5 V). */
  highMin: 3.0,
  /** Resistance inside an output pin (Ω). */
  pinOhms: 25,
  /** A pin is comfortable up to this (A)… */
  pinRated: 0.02,
  /** …and is being damaged above this (A). */
  pinMax: 0.04,
  /** Resistance of the 5 V supply (Ω). */
  supplyOhms: 0.05,
  /** Above this the board’s resettable fuse cuts the power (A). */
  fuseAmps: 0.5,
  /** Every potentiometer is 10 kΩ end to end. */
  potOhms: 10000,
  /** The resistor built into the LED module (Ω). */
  ledOhms: 220,
  /** Pull-down/pull-up resistor offered in the parts tray (Ω). */
  trayOhms: 10000,
  /** TMP36: 0.5 V at 0 °C, plus 10 mV per °C. */
  tmpOffset: 0.5,
  tmpPerDegree: 0.01,
  /** A servo's motor and electronics, seen from its power wires (Ω). */
  servoOhms: 50,
  /** A small DC gear motor's winding resistance (Ω). */
  motorOhms: 6,
  /** Below this a motor can't overcome its own friction (V). */
  motorStartVolts: 0.8,
  /** Voltage that counts as "full speed" for our 6 V motor, after the driver's losses (V). */
  motorFullVolts: 5.3,
  /** Full speed, in wheel turns per second. */
  motorRevsPerSec: 3,
  /** How quickly the shaft catches up with the voltage (s). */
  motorLag: 0.25,
  /** Resistance of each switch inside the motor driver (Ω). */
  driverOhms: 0.2,
  /** Default battery pack: 4 × AA. */
  batteryVolts: 6,
  batteryOhms: 0.3,
  /** Slots in the encoder disc: pulses per wheel turn. */
  encoderSlots: 20,
  /** Wheel travel per encoder pulse (cm): a 6.4 cm wheel goes about 20 cm per turn. */
  cmPerTick: 1,
}

export const BENCH_W = 860
export const BENCH_H = 470

/** Where each header pin's terminal sits on the bench. */
export function pinPosition(pin: BoardPin) {
  const i = BOARD_PINS.findIndex((p) => p.pin === pin)
  return { x: 384, y: 82 + i * 52 + (i >= 3 ? 22 : 0) }
}

export function microTerminalPosition(part: MicroPart, terminal: string) {
  const def = MICRO_PART_DEFS[part.kind].terminals.find((t) => t.name === terminal)
  return def ? { x: part.x + def.dx, y: part.y + def.dy } : { x: part.x, y: part.y }
}

export function refPosition(parts: MicroPart[], ref: MicroRef) {
  const { partId, terminal } = parseMicroRef(ref)
  if (partId === 'board') return pinPosition(terminal as BoardPin)
  const part = parts.find((p) => p.id === partId)
  return part ? microTerminalPosition(part, terminal) : { x: 0, y: 0 }
}

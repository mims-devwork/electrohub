import type { LedColor, Part, PartKind, PartProps } from './types'

export interface TerminalDef {
  name: string
  /** Position relative to the part centre, before rotation (canvas px). */
  dx: number
  dy: number
  /** Short label shown next to the terminal. */
  label: string
  /** Plain-language description used in hovers. */
  hint: string
}

export interface PartDef {
  kind: PartKind
  /** Friendly name first; technical names live in the component catalog. */
  name: string
  terminals: [TerminalDef, TerminalDef]
  defaults: PartProps
  /** Component catalog id used for "inspect in 3D" links. */
  catalogId: string
}

export const PART_DEFS: Record<PartKind, PartDef> = {
  battery: {
    kind: 'battery',
    name: 'Battery',
    catalogId: 'battery',
    defaults: { voltage: 9 },
    terminals: [
      { name: 'pos', dx: 56, dy: 0, label: '+', hint: 'Positive terminal (+). Conventional current leaves from here.' },
      { name: 'neg', dx: -56, dy: 0, label: '−', hint: 'Negative terminal (−). Current returns here to complete the loop.' },
    ],
  },
  resistor: {
    kind: 'resistor',
    name: 'Resistor',
    catalogId: 'resistor',
    defaults: { ohms: 470 },
    terminals: [
      { name: 'a', dx: -52, dy: 0, label: '', hint: 'Resistor leg. Resistors work the same in either direction.' },
      { name: 'b', dx: 52, dy: 0, label: '', hint: 'Resistor leg. Resistors work the same in either direction.' },
    ],
  },
  led: {
    kind: 'led',
    name: 'LED',
    catalogId: 'led',
    defaults: { color: 'red', burnt: false },
    terminals: [
      { name: 'anode', dx: -40, dy: 0, label: '+', hint: 'Long leg (anode, +). Connect towards the battery +.' },
      { name: 'cathode', dx: 40, dy: 0, label: '−', hint: 'Short leg (cathode, −). Connect towards the battery −.' },
    ],
  },
  switch: {
    kind: 'switch',
    name: 'Switch',
    catalogId: 'switch',
    defaults: { closed: false },
    terminals: [
      { name: 'a', dx: -46, dy: 0, label: '', hint: 'Switch contact.' },
      { name: 'b', dx: 46, dy: 0, label: '', hint: 'Switch contact.' },
    ],
  },
  button: {
    kind: 'button',
    name: 'Push button',
    catalogId: 'button',
    defaults: { closed: false },
    terminals: [
      { name: 'a', dx: -40, dy: 0, label: '', hint: 'Button contact.' },
      { name: 'b', dx: 40, dy: 0, label: '', hint: 'Button contact.' },
    ],
  },
}

export const LED_SPECS: Record<LedColor, { vf: number; hex: string; label: string }> = {
  red: { vf: 2.0, hex: '#ff3b3b', label: 'Red' },
  yellow: { vf: 2.1, hex: '#ffd23b', label: 'Yellow' },
  green: { vf: 2.2, hex: '#3bff6e', label: 'Green' },
  blue: { vf: 3.0, hex: '#3b8bff', label: 'Blue' },
  white: { vf: 3.0, hex: '#f4f7ff', label: 'White' },
}

/** Electrical constants used by the simulator. Tuned for believable hobby parts. */
export const ELECTRICAL = {
  /** Resistance of a jumper wire (Ω). */
  wireOhms: 0.01,
  /** Closed switch contact resistance (Ω). */
  switchOhms: 0.02,
  /** LED internal series resistance when conducting (Ω). */
  ledSeriesOhms: 15,
  /** Comfortable LED current (A). */
  ledRated: 0.02,
  /** Above this the LED is being pushed too hard (A). */
  ledWarn: 0.025,
  /** Above this the LED burns out (A). */
  ledBurn: 0.05,
  /** Typical small resistor power rating (W). */
  resistorWatts: 0.25,
  /** Battery current that counts as a short circuit (A). */
  shortCircuit: 1,
}

export const BATTERY_OPTIONS = [1.5, 3, 4.5, 9] as const

/** Internal resistance grows with the number of cells in series. */
export function batteryInternalOhms(voltage: number): number {
  return Math.max(0.3, (voltage / 1.5) * 0.25)
}

/** Standard resistor values (E6 series subset) a beginner kit would contain. */
export const RESISTOR_OPTIONS = [10, 47, 100, 220, 330, 470, 680, 1000, 2200, 4700, 10000] as const

export function terminalRef(partId: string, terminal: string) {
  return `${partId}:${terminal}`
}

export function parseRef(ref: string): { partId: string; terminal: string } {
  const i = ref.lastIndexOf(':')
  return { partId: ref.slice(0, i), terminal: ref.slice(i + 1) }
}

export function terminalsOf(part: Part): [string, string] {
  const [a, b] = PART_DEFS[part.kind].terminals
  return [terminalRef(part.id, a.name), terminalRef(part.id, b.name)]
}

/** Absolute canvas position of a terminal, taking rotation into account. */
export function terminalPosition(part: Part, terminalName: string): { x: number; y: number } {
  const def = PART_DEFS[part.kind].terminals.find((t) => t.name === terminalName)
  if (!def) return { x: part.x, y: part.y }
  const r = (part.rot * Math.PI) / 180
  const cos = Math.round(Math.cos(r))
  const sin = Math.round(Math.sin(r))
  return { x: part.x + def.dx * cos - def.dy * sin, y: part.y + def.dx * sin + def.dy * cos }
}

export function formatOhms(ohms: number): string {
  if (ohms >= 1000) return `${+(ohms / 1000).toFixed(1)} kΩ`
  return `${ohms} Ω`
}

export function formatAmps(amps: number): string {
  const a = Math.abs(amps)
  if (a < 0.0005) return '0 mA'
  if (a < 1) return `${(a * 1000).toFixed(a < 0.01 ? 1 : 0)} mA`
  return `${a.toFixed(2)} A`
}

export function formatVolts(v: number): string {
  return `${Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2)} V`
}

export function formatWatts(w: number): string {
  if (w < 1) return `${(w * 1000).toFixed(0)} mW`
  return `${w.toFixed(2)} W`
}

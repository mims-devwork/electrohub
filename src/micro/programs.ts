import { PIN_BY_ID } from './board'
import type { BoardPin, PinOutputs, ProgramId } from './types'

// The programs that run on the bench's board. Each one is shown as real
// Arduino-style code, but runs as a small TypeScript function so we can step
// it in the browser. Slots are the parts of the code the learner can edit.

export type CodeToken = string | { slot: string }

export interface ProgramIO {
  analogRead: (pin: BoardPin) => number
  digitalRead: (pin: BoardPin) => 0 | 1
}

export interface ProgramRun {
  outputs: PinOutputs
  /** One line for the serial monitor, if the program prints anything. */
  serial?: string
  /** Tags of the code lines that just ran (for highlighting). */
  active: string[]
}

export interface ProgramDef {
  id: ProgramId
  name: string
  lines: { code: CodeToken[]; tag?: string }[]
  slots: Record<string, { label: string; options: string[]; default: string }>
  /** Pins the program reads. */
  reads: BoardPin[]
  /** Pins the program drives, given the current slot values. */
  outputs: (slots: Record<string, string>) => BoardPin[]
  /** Column heading for the serial monitor (omit if the program never prints). */
  serialHeader?: string
  run: (io: ProgramIO, slots: Record<string, string>) => ProgramRun
}

/** Arduino's analogWrite(): real PWM on ~ pins; plain on/off everywhere else. */
export function analogWrite(pin: BoardPin, value: number): number {
  const v = Math.max(0, Math.min(255, Math.round(value)))
  if (PIN_BY_ID[pin].pwm) return v / 255
  return v < 128 ? 0 : 1
}

const pinFromNumber = (n: string): BoardPin => `D${n}` as BoardPin

export const PROGRAMS: Record<ProgramId, ProgramDef> = {
  'read-pot': {
    id: 'read-pot',
    name: 'read_knob.ino',
    reads: ['A0', 'D2'],
    outputs: () => [],
    slots: {},
    serialHeader: 'A0      D2',
    lines: [
      { code: ['void setup() {'] },
      { code: ['  Serial.begin(9600);       // talk to the serial monitor'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  int a = analogRead(A0);   // 0 to 1023'], tag: 'a' },
      { code: ['  int d = digitalRead(2);   // 0 or 1'], tag: 'd' },
      { code: ['  Serial.print(a);'], tag: 'print' },
      { code: ['  Serial.print("     ");'], tag: 'print' },
      { code: ['  Serial.println(d);'], tag: 'print' },
      { code: ['}'] },
    ],
    run: (io) => {
      const a = io.analogRead('A0')
      const d = io.digitalRead('D2')
      return { outputs: {}, serial: `${String(a).padEnd(8)}${d}`, active: ['a', 'd', 'print'] }
    },
  },

  'button-led': {
    id: 'button-led',
    name: 'button_led.ino',
    reads: ['D2'],
    outputs: () => ['D13'],
    slots: { when: { label: 'Light the LED when pin 2 reads…', options: ['HIGH', 'LOW'], default: 'HIGH' } },
    lines: [
      { code: ['void setup() {'] },
      { code: ['  pinMode(2, INPUT);'] },
      { code: ['  pinMode(13, OUTPUT);'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  if (digitalRead(2) == ', { slot: 'when' }, ') {'], tag: 'read' },
      { code: ['    digitalWrite(13, HIGH);   // LED on'], tag: 'on' },
      { code: ['  } else {'], tag: 'else' },
      { code: ['    digitalWrite(13, LOW);    // LED off'], tag: 'off' },
      { code: ['  }'] },
      { code: ['}'] },
    ],
    run: (io, slots) => {
      const want = slots.when === 'LOW' ? 0 : 1
      const match = io.digitalRead('D2') === want
      return { outputs: { D13: match ? 1 : 0 }, active: match ? ['read', 'on'] : ['read', 'else', 'off'] }
    },
  },

  dimmer: {
    id: 'dimmer',
    name: 'dimmer.ino',
    reads: ['A0'],
    outputs: (slots) => [pinFromNumber(slots.pin ?? '9')],
    slots: { pin: { label: 'Pin to write the brightness to', options: ['13', '9'], default: '13' } },
    serialHeader: 'level (0–255)',
    lines: [
      { code: ['void setup() {'] },
      { code: ['  Serial.begin(9600);'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  int reading = analogRead(A0);   // 0 to 1023'], tag: 'read' },
      { code: ['  int level = reading / 4;        // 0 to 255'], tag: 'scale' },
      { code: ['  analogWrite(', { slot: 'pin' }, ', level);        // brightness'], tag: 'write' },
      { code: ['  Serial.println(level);'], tag: 'print' },
      { code: ['}'] },
    ],
    run: (io, slots) => {
      const reading = io.analogRead('A0')
      const level = Math.floor(reading / 4)
      const pin = pinFromNumber(slots.pin ?? '9')
      return { outputs: { [pin]: analogWrite(pin, level) }, serial: String(level), active: ['read', 'scale', 'write', 'print'] }
    },
  },
}

export function defaultSlots(id: ProgramId, overrides: Record<string, string> = {}) {
  const slots: Record<string, string> = {}
  for (const [k, s] of Object.entries(PROGRAMS[id].slots)) slots[k] = s.default
  return { ...slots, ...overrides }
}

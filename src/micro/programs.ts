import { PIN_BY_ID } from './board'
import type { BoardPin, PinOutputs, ProgramId } from './types'

// The programs that run on the bench's board. Each one is shown as real
// Arduino-style code, but runs as a small TypeScript function so we can step
// it in the browser. Slots are the parts of the code the learner can edit.

export type CodeToken = string | { slot: string }

export interface ProgramIO {
  analogRead: (pin: BoardPin) => number
  digitalRead: (pin: BoardPin) => 0 | 1
  /** Pulses counted on an interrupt pin since the board last reset. */
  ticks: (pin: BoardPin) => number
}

export interface ProgramRun {
  outputs: PinOutputs
  /** One line for the serial monitor, if the program prints anything. */
  serial?: string
  /** Tags of the code lines that just ran (for highlighting). */
  active: string[]
  /** Named values the program worked out, for goals and lab notes (e.g. celsius). */
  values?: Record<string, number>
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
  /** Offer the board's reset button, for programs whose variables are worth starting fresh. */
  resettable?: boolean
  run: (io: ProgramIO, slots: Record<string, string>) => ProgramRun
}

/** Arduino's analogWrite(): real PWM on ~ pins; plain on/off everywhere else. */
export function analogWrite(pin: BoardPin, value: number): number {
  const v = Math.max(0, Math.min(255, Math.round(value)))
  if (PIN_BY_ID[pin].pwm) return v / 255
  return v < 128 ? 0 : 1
}

const pinFromNumber = (n: string): BoardPin => `D${n}` as BoardPin

/** The Servo library: a pulse every 20 ms, 1 ms long for 0° up to 2 ms for 180°. */
export const servoPulse = (angle: number) => (1 + Math.max(0, Math.min(180, angle)) / 180) / 20

/** Arduino's map(): scale a number from one range to another (whole numbers). */
const mapRange = (x: number, inLo: number, inHi: number, outLo: number, outHi: number) => Math.trunc(((x - inLo) * (outHi - outLo)) / (inHi - inLo) + outLo)

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

  temp: {
    id: 'temp',
    name: 'thermometer.ino',
    reads: ['A0'],
    outputs: () => ['D13'],
    slots: {
      offset: { label: 'Volts at 0 °C', options: ['0', '0.5', '1.0'], default: '0' },
      scale: { label: 'Degrees per volt', options: ['10', '100', '1000'], default: '100' },
      limit: { label: 'Warning temperature (°C)', options: ['25', '30', '35'], default: '30' },
    },
    serialHeader: 'temperature (°C)',
    lines: [
      { code: ['void setup() {'] },
      { code: ['  Serial.begin(9600);'] },
      { code: ['  pinMode(13, OUTPUT);'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  int reading = analogRead(A0);           // 0 to 1023'], tag: 'read' },
      { code: ['  float volts = reading * 5.0 / 1023;     // back to volts'], tag: 'volts' },
      { code: ['  float celsius = (volts - ', { slot: 'offset' }, ') * ', { slot: 'scale' }, ';'], tag: 'convert' },
      { code: ['  Serial.println(celsius);'], tag: 'print' },
      { code: ['  if (celsius > ', { slot: 'limit' }, ') {'], tag: 'check' },
      { code: ['    digitalWrite(13, HIGH);   // too hot: warning light on'], tag: 'on' },
      { code: ['  } else {'], tag: 'else' },
      { code: ['    digitalWrite(13, LOW);'], tag: 'off' },
      { code: ['  }'] },
      { code: ['}'] },
    ],
    run: (io, slots) => {
      const reading = io.analogRead('A0')
      const volts = (reading * 5.0) / 1023
      const celsius = (volts - Number(slots.offset)) * Number(slots.scale)
      const hot = celsius > Number(slots.limit)
      return {
        outputs: { D13: hot ? 1 : 0 },
        serial: celsius.toFixed(2),
        values: { celsius },
        active: ['read', 'volts', 'convert', 'print', 'check', ...(hot ? ['on'] : ['else', 'off'])],
      }
    },
  },

  servo: {
    id: 'servo',
    name: 'servo_knob.ino',
    reads: ['A0'],
    outputs: () => ['D9'],
    slots: { top: { label: 'Angle when the knob is turned all the way', options: ['180', '90', '45'], default: '180' } },
    serialHeader: 'angle (°)',
    lines: [
      { code: ['#include <Servo.h>'] },
      { code: ['Servo arm;'] },
      { code: [''] },
      { code: ['void setup() {'] },
      { code: ['  Serial.begin(9600);'] },
      { code: ['  arm.attach(9);              // servo signal on pin 9'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  int reading = analogRead(A0);                   // the knob'], tag: 'read' },
      { code: ['  int angle = map(reading, 0, 1023, 0, ', { slot: 'top' }, ');'], tag: 'map' },
      { code: ['  arm.write(angle);                               // point there'], tag: 'write' },
      { code: ['  Serial.println(angle);'], tag: 'print' },
      { code: ['}'] },
    ],
    run: (io, slots) => {
      const angle = mapRange(io.analogRead('A0'), 0, 1023, 0, Number(slots.top))
      return { outputs: { D9: servoPulse(angle) }, serial: String(angle), values: { angle }, active: ['read', 'map', 'write', 'print'] }
    },
  },

  motor: {
    id: 'motor',
    name: 'motor.ino',
    reads: [],
    outputs: () => ['D9', 'D13'],
    slots: {
      dir: { label: 'Direction (pin 13)', options: ['LOW', 'HIGH'], default: 'LOW' },
      speed: { label: 'Speed (0–255)', options: ['0', '64', '128', '192', '255'], default: '255' },
    },
    lines: [
      { code: ['void setup() {'] },
      { code: ['  pinMode(13, OUTPUT);'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  digitalWrite(13, ', { slot: 'dir' }, ');      // DIR: which way'], tag: 'dir' },
      { code: ['  analogWrite(9, ', { slot: 'speed' }, ');        // EN: how fast (0–255)'], tag: 'en' },
      { code: ['}'] },
    ],
    run: (_io, slots) => ({
      outputs: { D13: slots.dir === 'HIGH' ? 1 : 0, D9: analogWrite('D9', Number(slots.speed)) },
      active: ['dir', 'en'],
    }),
  },

  encoder: {
    id: 'encoder',
    name: 'drive_distance.ino',
    reads: [],
    outputs: () => ['D9'],
    slots: {
      target: { label: 'Stop after this many pulses', options: ['50', '100', '1000'], default: '1000' },
      speed: { label: 'Motor speed', options: ['200', '90', 'max(60, 4 * (TARGET - ticks))'], default: '200' },
    },
    serialHeader: 'ticks',
    resettable: true,
    lines: [
      { code: ['volatile long ticks = 0;'] },
      { code: ['void countTick() { ticks++; }      // runs on every pulse'], tag: 'tick' },
      { code: ['const long TARGET = ', { slot: 'target' }, ';'] },
      { code: [''] },
      { code: ['void setup() {'] },
      { code: ['  Serial.begin(9600);'] },
      { code: ['  attachInterrupt(digitalPinToInterrupt(2), countTick, RISING);'] },
      { code: ['}'] },
      { code: [''] },
      { code: ['void loop() {'] },
      { code: ['  if (ticks < TARGET) {'], tag: 'check' },
      { code: ['    analogWrite(9, ', { slot: 'speed' }, ');'], tag: 'drive' },
      { code: ['  } else {'], tag: 'else' },
      { code: ['    analogWrite(9, 0);               // stop'], tag: 'stop' },
      { code: ['  }'] },
      { code: ['  Serial.println(ticks);'], tag: 'print' },
      { code: ['}'] },
    ],
    run: (io, slots) => {
      const ticks = io.ticks('D2')
      const target = Number(slots.target)
      const going = ticks < target
      const speed = slots.speed.startsWith('max') ? Math.max(60, 4 * (target - ticks)) : Number(slots.speed)
      return {
        outputs: { D9: going ? analogWrite('D9', speed) : 0 },
        serial: String(ticks),
        values: { ticks },
        active: ['check', 'print', ...(going ? ['drive'] : ['else', 'stop']), ...(ticks > 0 ? ['tick'] : [])],
      }
    },
  },
}

export function defaultSlots(id: ProgramId, overrides: Record<string, string> = {}) {
  const slots: Record<string, string> = {}
  for (const [k, s] of Object.entries(PROGRAMS[id].slots)) slots[k] = s.default
  return { ...slots, ...overrides }
}

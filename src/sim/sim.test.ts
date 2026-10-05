import { describe, expect, it } from 'vitest'
import { diagnose } from './diagnose'
import { emptyHistory, goalMet, updateHistory } from './goals'
import { simulate } from './solve'
import type { Circuit, Part, Wire } from './types'

const battery = (v = 9): Part => ({ id: 'bat', kind: 'battery', x: 0, y: 0, rot: 0, props: { voltage: v } })
const led = (extra: Partial<Part['props']> = {}): Part => ({
  id: 'led',
  kind: 'led',
  x: 0,
  y: 0,
  rot: 0,
  props: { color: 'red', ...extra },
})
const res = (ohms: number): Part => ({ id: 'r', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms } })
const sw = (closed: boolean): Part => ({ id: 'sw', kind: 'switch', x: 0, y: 0, rot: 0, props: { closed } })
const w = (id: string, from: string, to: string): Wire => ({ id, from, to })

describe('simulate', () => {
  it('lights an LED through a resistor with a believable current', () => {
    const c: Circuit = {
      parts: [battery(), res(470), led()],
      wires: [w('w1', 'bat:pos', 'r:a'), w('w2', 'r:b', 'led:anode'), w('w3', 'led:cathode', 'bat:neg')],
    }
    const s = simulate(c)
    const i = s.parts.led.current
    // (9 - 2.0) / (470 + 15 + 1.5) ≈ 14.4 mA
    expect(i).toBeGreaterThan(0.0135)
    expect(i).toBeLessThan(0.0155)
    expect(s.parts.led.ledState).toBe('on')
    expect(s.parts.bat.current).toBeCloseTo(i, 4)
    expect(s.wires.w1).toBeCloseTo(i, 4)
    expect(diagnose(c, s).some((x) => x.severity === 'success')).toBe(true)
  })

  it('flags an LED connected straight to the battery as overloaded', () => {
    const c: Circuit = {
      parts: [battery(), led()],
      wires: [w('w1', 'bat:pos', 'led:anode'), w('w2', 'led:cathode', 'bat:neg')],
    }
    const s = simulate(c)
    expect(s.parts.led.overload).toBe(true)
  })

  it('keeps a reversed LED dark and explains why', () => {
    const c: Circuit = {
      parts: [battery(), res(470), led()],
      wires: [w('w1', 'bat:pos', 'r:a'), w('w2', 'r:b', 'led:cathode'), w('w3', 'led:anode', 'bat:neg')],
    }
    const s = simulate(c)
    expect(s.parts.led.ledState).toBe('off')
    expect(diagnose(c, s).map((i) => i.id)).toContain('reversed-led')
  })

  it('detects a short circuit', () => {
    const c: Circuit = { parts: [battery()], wires: [w('w1', 'bat:pos', 'bat:neg')] }
    const s = simulate(c)
    expect(s.parts.bat.current).toBeGreaterThan(1)
    expect(diagnose(c, s)[0].id).toBe('short-bat')
  })

  it('reports an open loop', () => {
    const c: Circuit = { parts: [battery(), res(470), led()], wires: [w('w1', 'bat:pos', 'r:a')] }
    const s = simulate(c)
    expect(s.parts.led.current).toBe(0)
    expect(diagnose(c, s).map((i) => i.id)).toContain('open-loop')
  })

  it('tracks a switch controlling an LED', () => {
    const wires = [
      w('w1', 'bat:pos', 'sw:a'),
      w('w2', 'sw:b', 'r:a'),
      w('w3', 'r:b', 'led:anode'),
      w('w4', 'led:cathode', 'bat:neg'),
    ]
    let h = emptyHistory()
    const open: Circuit = { parts: [battery(), sw(false), res(470), led()], wires }
    h = updateHistory(h, open, simulate(open))
    const closed: Circuit = { parts: [battery(), sw(true), res(470), led()], wires }
    const s = simulate(closed)
    h = updateHistory(h, closed, s)
    expect(goalMet({ type: 'switchControlsLed' }, closed, s, h)).toBe(true)
  })

  it('handles two LEDs in parallel sharing a resistor', () => {
    const led2: Part = { ...led(), id: 'led2', props: { color: 'blue' } }
    const c: Circuit = {
      parts: [battery(), res(220), led(), led2],
      wires: [
        w('w1', 'bat:pos', 'r:a'),
        w('w2', 'r:b', 'led:anode'),
        w('w3', 'r:b', 'led2:anode'),
        w('w4', 'led:cathode', 'bat:neg'),
        w('w5', 'led2:cathode', 'bat:neg'),
      ],
    }
    const s = simulate(c)
    // The red LED (lower forward voltage) hogs the current.
    expect(s.parts.led.current).toBeGreaterThan(s.parts.led2.current)
  })
})

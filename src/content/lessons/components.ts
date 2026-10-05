import type { Lesson } from '../types'

export const COMPONENT_LESSONS: Lesson[] = [
  {
    id: 'led-legs',
    levelN: 2,
    hubId: 'components',
    title: 'Which way round? Meet the LED',
    summary: 'LEDs only work one way. Learn to read their legs before you plug one in.',
    minutes: 3,
    xp: 40,
    steps: [
      {
        kind: 'talk',
        title: 'A light that only lets current go one way',
        body: [
          'An LED is a tiny light that switches on when current flows through it, but only in one direction. Wire it backwards and it just stays dark.',
          'So before you use one, you need to know which leg is which.',
        ],
        term: { name: 'LED (light-emitting diode)', plain: 'A one-way part that glows when current flows through it the right way.' },
      },
      {
        kind: 'try',
        title: 'Find the legs',
        prompt: 'Rotate the LED. Click the leg that should connect towards the battery’s +, then the one that goes towards −.',
        widget: 'led-legs',
        goal: { event: 'found-both', label: 'Identify both legs' },
        reveal: 'Long leg = + (anode). Short leg = − (cathode), and the rim of the LED has a flat edge on that side. If the legs have been trimmed, look for the flat edge.',
      },
    ],
  },
  {
    id: 'resistor-colors',
    levelN: 2,
    hubId: 'components',
    title: 'Reading a resistor',
    summary: 'Resistors are too small to print numbers on, so they use coloured stripes.',
    minutes: 4,
    xp: 40,
    steps: [
      {
        kind: 'talk',
        title: 'Stripes instead of numbers',
        body: [
          'A resistor’s value is shown by coloured bands. The first two bands are digits and the third says how many zeros to add.',
          'Black 0 · Brown 1 · Red 2 · Orange 3 · Yellow 4 · Green 5 · Blue 6 · Violet 7 · Grey 8 · White 9. The fourth band, gold or silver, shows how accurate it is, and you read from the other end.',
        ],
        term: { name: 'Color code', plain: 'Band 1 and band 2 give the digits, and band 3 gives the number of zeros.' },
      },
      {
        kind: 'try',
        title: 'Decode three resistors',
        prompt: 'Read the bands and pick the matching value. Get three right.',
        widget: 'color-bands',
        goal: { event: 'decoded-3', label: 'Decode 3 resistors' },
        reveal: 'You don’t need to memorise this. Engineers look it up or use a multimeter. But being able to read a common value like 330 Ω or 10 kΩ at a glance makes building much faster.',
      },
    ],
  },
]

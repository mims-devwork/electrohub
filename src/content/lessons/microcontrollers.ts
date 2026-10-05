import type { Lesson } from '../types'

export const MICROCONTROLLER_LESSONS: Lesson[] = [
  // ——— Level 4: Understand Signals ———
  {
    id: 'signals',
    levelN: 4,
    hubId: 'microcontrollers',
    title: 'Signals: voltage with a message',
    summary: 'How a voltage can carry information, and the difference between digital and analog.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Voltage that means something',
        body: [
          'So far, voltage has been the push that drives current round a loop. From now on it has a second job: carrying a message.',
          'A button wired to a pin says “pressed” or “not pressed” by putting 5 V or 0 V on the wire. A temperature sensor says how warm it is by raising or lowering its voltage. Any voltage that carries information like this is called a signal.',
        ],
        term: { name: 'Signal', plain: 'A voltage that changes to carry information, like “pressed” or “23 °C”.' },
      },
      {
        kind: 'try',
        title: 'Two kinds of signal',
        prompt: 'Flip the switch a few times, then turn the knob slowly up and down. Watch what each one draws on the scope.',
        widget: 'signal-scope',
        goal: { event: 'both-signals', label: 'Make both kinds of signal' },
        reveal: 'The switch can only make two levels, 0 V or 5 V, and it jumps straight between them. The knob can make any voltage in between and glides smoothly. Those are the two kinds of signal in electronics.',
      },
      {
        kind: 'talk',
        title: 'Digital and analog',
        body: [
          'A signal with only two allowed values is digital. We call them HIGH and LOW, or 1 and 0. Buttons, switches and on/off commands are digital.',
          'A signal that can be any value in a range is analog. Knobs, light levels, temperatures and battery voltages are analog. The real world is mostly analog and computers are digital, so a lot of a robot’s electronics is about translating between the two.',
        ],
        term: { name: 'Digital / Analog', plain: 'A digital signal has only two values (HIGH or LOW). An analog signal can be any value in a range.' },
        analogy: {
          text: 'A digital signal is like a light switch: on or off. An analog signal is like a dimmer: anywhere from off to full.',
          limit: 'A real digital signal is never exactly 0 V or 5 V. Wires and parts nudge it around a little, so a chip needs a rule for deciding what counts as HIGH. That’s next.',
        },
      },
      {
        kind: 'try',
        title: 'Where does HIGH begin?',
        prompt: 'This is a digital input pin on a 5 V chip. Slide the voltage on it from 0 V up to 5 V and watch what the pin decides it’s seeing.',
        widget: 'logic-threshold',
        goal: { event: 'found-zones', label: 'Find LOW, HIGH and the zone in between' },
        reveal: 'Below 1.5 V the pin always reads LOW, and above 3.0 V it always reads HIGH. In between, the chip makes no promises, so it can flip either way. Good digital signals stay well clear of that middle zone.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Which of these is an analog signal?',
        options: [
          { text: 'A button that is either pressed or not', correct: false, feedback: 'That only has two states, so it’s digital.' },
          { text: 'A light sensor whose voltage rises smoothly as the room gets brighter', correct: true, feedback: 'Yes. It can be any voltage in its range, so it’s analog.' },
          { text: 'A pin switching an LED fully on or fully off', correct: false, feedback: 'Fully on and fully off are just two states. That’s digital.' },
        ],
      },
    ],
  },
  {
    id: 'voltage-divider',
    levelN: 4,
    hubId: 'microcontrollers',
    title: 'Splitting a voltage',
    summary: 'Two resistors in a row share the push. Tap in between them and you get a smaller voltage that you choose.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Two resistors share the push',
        body: [
          'Remember measuring round the loop in the ground lesson? The voltage dropped a little across each resistor, step by step, until it reached 0 V.',
          'Put two resistors in series between 5 V and GND and the 5 V gets shared between them, so the point in the middle sits somewhere in between. Equal resistors share it equally, which puts the middle at 2.5 V. A bigger resistor takes a bigger share.',
        ],
        term: { name: 'Voltage divider', plain: 'Two resistors in series. The voltage at the point between them is a fixed fraction of the total.' },
        analogy: {
          text: 'Think of voltage as height. 5 V is the top of a hill and GND is the bottom. The two resistors are two stretches of path down the hill, and the bigger resistor is the stretch that drops further.',
          limit: 'A divider only holds its voltage while almost no current is taken from the middle. Connect something hungry there, like a motor, and the voltage sags. A microcontroller input takes almost nothing, so it’s fine.',
        },
      },
      {
        kind: 'try',
        title: 'Make 2.5 V',
        prompt: 'Pick values for the two resistors. Get the middle point to exactly 2.5 V, half of 5 V.',
        widget: 'divider',
        widgetProps: { target: 2.5, tolerance: 0.02, r1: 1000, r2: 4700 },
        goal: { event: 'divider-hit', label: 'Make 2.5 V' },
        reveal: 'Any two equal resistors give exactly half, whether they’re 220 Ω or 10 kΩ. Only the ratio between them matters, not their size.',
      },
      {
        kind: 'talk',
        title: 'The divider rule',
        body: [
          'There’s a rule for it: V out = V in × R2 ÷ (R1 + R2), where R1 is the resistor at the top and R2 is the one between the middle point and GND.',
          'With 1 kΩ on top and 2.2 kΩ underneath: 5 × 2200 ÷ 3200 ≈ 3.4 V. The bottom resistor holds up its share of the voltage, so the bigger it is compared with the top one, the higher the middle sits.',
        ],
      },
      {
        kind: 'try',
        title: 'Challenge: about 3.3 V',
        prompt: 'Lots of chips run on 3.3 V instead of 5 V. Choose two resistors that bring 5 V down to within 0.15 V of 3.3 V.',
        widget: 'divider',
        widgetProps: { target: 3.3, tolerance: 0.15, r1: 1000, r2: 1000 },
        goal: { event: 'divider-hit', label: 'Make about 3.3 V' },
        reveal: 'The bottom resistor needs to be about twice the top one. 3.3 is roughly two thirds of 5, so R2 has to hold about two thirds of the voltage. Engineers use this exact trick to bring a 5 V signal down safely for a 3.3 V chip.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Two 10 kΩ resistors are in series across a 9 V battery. What’s the voltage at the point between them?',
        options: [
          { text: '9 V', correct: false, feedback: 'That’s the top of the divider. The middle point is partway down.' },
          { text: '4.5 V', correct: true, feedback: 'Yes. Equal resistors share the voltage equally: 9 × 10k ÷ 20k = 4.5 V.' },
          { text: '0 V', correct: false, feedback: 'That’s the bottom, at ground. The middle is halfway between.' },
        ],
      },
    ],
  },
  {
    id: 'potentiometer',
    levelN: 4,
    hubId: 'microcontrollers',
    title: 'The knob: an adjustable divider',
    summary: 'A potentiometer is a voltage divider you can turn. It’s how a robot reads a knob, a joystick or a servo’s position.',
    minutes: 4,
    xp: 40,
    steps: [
      {
        kind: 'talk',
        title: 'A divider with a slider',
        body: [
          'Inside a potentiometer (a “pot” for short) is one long strip of resistor material, called the track. Its two ends come out as the two outer legs.',
          'The middle leg is connected to a contact called the wiper, which slides along the track as you turn the knob. The wiper splits the track into two pieces, and those two pieces are the two resistors of a voltage divider.',
        ],
        term: { name: 'Potentiometer (pot)', plain: 'A resistor track with a sliding contact called the wiper. Turn the knob to pick any voltage between its two ends.' },
      },
      {
        kind: 'try',
        title: 'Turn the knob',
        prompt: 'Turn the knob and watch how the wiper splits the 10 kΩ track, and what that does to the voltage on the middle leg. Visit both ends, and stop once near the middle (2.5 V).',
        widget: 'pot-knob',
        goal: { event: 'pot-explored', label: 'Reach 0 V, 5 V and about 2.5 V' },
        reveal: 'Wherever you turn it, the two pieces always add up to 10 kΩ. Only the split changes, and the split sets the voltage. Volume knobs, joysticks and the position sensor inside a servo all work like this.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'A pot’s outer legs are wired to 5V and GND. You connect a microcontroller pin to one of the outer legs. What does the pin see as you turn the knob?',
        options: [
          { text: 'A voltage that changes with the knob', correct: false, feedback: 'The outer legs are the fixed ends of the track. Only the wiper moves.' },
          { text: 'A fixed 5 V or 0 V, whatever you do to the knob', correct: true, feedback: 'Right. The ends of the track never move. To read the knob you have to use the middle leg, the wiper.' },
          { text: 'Nothing, because the pot won’t work like that', correct: false, feedback: 'Current still flows along the track from end to end. It’s just that the outer legs don’t change.' },
        ],
      },
    ],
  },

  // ——— Level 5: Meet the Microcontroller ———
  {
    id: 'meet-mcu',
    levelN: 5,
    hubId: 'microcontrollers',
    title: 'Meet the microcontroller',
    summary: 'A whole computer on one chip, and the pins it uses to sense and control the world.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'A computer on a chip',
        body: [
          'A microcontroller is a tiny but complete computer squeezed onto one chip. It has a processor to follow instructions, memory to hold a program, and pins to connect to the outside world.',
          'It’s much simpler than a laptop. It runs a single program, from the moment it gets power until the moment it loses it. That’s exactly what a robot needs: read the sensors, decide, drive the motors, and repeat, forever.',
          'We’ll use a board like an Arduino Uno. The chip sits in the middle, with a USB socket for loading programs and a row of pins down the edge.',
        ],
        term: { name: 'Microcontroller (MCU)', plain: 'A small computer on a single chip that runs one program and controls hardware through its pins.' },
        analogy: {
          text: 'A microcontroller is like a very fast, very literal assistant with a checklist. It works down the list, reaches the end, and starts again at the top.',
          limit: 'An assistant would notice if something looked wrong. A microcontroller does exactly what the program says, even when that’s a mistake.',
        },
      },
      {
        kind: 'try',
        title: 'Find your way round the pins',
        prompt: 'Your board has a few different kinds of pins. Follow each instruction and click the right pin.',
        widget: 'pin-finder',
        goal: { event: 'pins-found', label: 'Find all five pins' },
        reveal: 'The power pins (5V and GND) feed your circuit. A pins measure voltages. D pins are digital, and ~ pins can also do PWM, which you’ll meet soon. Every robot project starts by deciding which pin does what.',
      },
      {
        kind: 'talk',
        title: 'Pins can listen or speak',
        body: [
          'The program decides whether each digital pin is an input or an output. This is called GPIO: general-purpose input/output.',
          'As an output, a pin acts like a tiny switchable battery: the program sets it HIGH (5 V) or LOW (0 V). As an input, it acts like a voltmeter that only answers HIGH or LOW.',
          'An output pin can only supply a small current. About 20 mA is comfortable and 40 mA is the absolute limit. That’s plenty for an LED with a resistor, but nowhere near enough for a motor.',
        ],
        term: { name: 'GPIO (general-purpose input/output)', plain: 'A pin that the program can set as an input (to read) or an output (to switch on and off).' },
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Why can’t you plug a motor straight into an output pin?',
        options: [
          { text: 'A pin can only supply about 20 mA, and a motor needs hundreds of milliamps', correct: true, feedback: 'Exactly. The pin would overload. In the Robotics Lab you’ll use a motor driver, so the pin’s small signal can switch the motor’s big current.' },
          { text: 'Motors only work with AC', correct: false, feedback: 'Small robot motors run on DC from a battery. The problem is how much current they need.' },
          { text: 'The pin’s voltage is too high for a motor', correct: false, feedback: 'Plenty of small motors run happily on 5 V. The problem is current, not voltage.' },
        ],
      },
    ],
  },
  {
    id: 'first-code',
    levelN: 5,
    hubId: 'microcontrollers',
    title: 'Your first program',
    summary: 'How a microcontroller follows code line by line, and why loop() never stops.',
    minutes: 6,
    xp: 60,
    steps: [
      {
        kind: 'talk',
        title: 'Instructions, in order',
        body: [
          'A program is a list of instructions. The microcontroller carries them out one at a time, top to bottom, millions of times faster than you could read them.',
          'Arduino programs have two parts. setup() runs once, when the board powers up, and is where you tell each pin whether it’s an input or an output. Then loop() runs, and when it reaches the end it starts again from the top. Forever.',
        ],
        term: { name: 'setup() and loop()', plain: 'setup() runs once at power-up. loop() then repeats for as long as the board has power.' },
      },
      {
        kind: 'try',
        title: 'Step through Blink',
        prompt: 'This is Blink, the “hello world” of microcontrollers. Press Step to run one line at a time, and watch the pin, the LED and the clock. Keep going until loop() starts again.',
        widget: 'code-stepper',
        widgetProps: { mode: 'step' },
        goal: { event: 'blink-cycle', label: 'Run one full pass of loop()' },
        reveal: 'digitalWrite sets the pin, and delay just waits. Without the delays, the LED would flash so fast it would look permanently half-on. After the last line, the board jumps straight back to the top of loop().',
      },
      {
        kind: 'try',
        title: 'Make it blink faster',
        prompt: 'Now the code runs by itself. Change both delay values so the LED blinks quickly: 200 ms or less for both.',
        widget: 'code-stepper',
        widgetProps: { mode: 'edit' },
        goal: { event: 'fast-blink', label: 'Both delays at 200 ms or less' },
        reveal: 'You changed how the hardware behaves without touching a single wire. That’s the whole point of a microcontroller: the same circuit can do completely different things, depending on the code.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'The board reaches the closing } of loop(). What happens next?',
        options: [
          { text: 'The program ends and the board switches off', correct: false, feedback: 'A microcontroller program never really ends. When loop() finishes, it starts again.' },
          { text: 'It runs loop() again from the top', correct: true, feedback: 'Yes. loop() repeats for as long as the board has power.' },
          { text: 'It runs setup() again', correct: false, feedback: 'setup() only runs once, at power-up (or after you press reset).' },
        ],
      },
    ],
  },
  {
    id: 'pwm',
    levelN: 5,
    hubId: 'microcontrollers',
    title: 'PWM: dimming with a digital pin',
    summary: 'An output pin can only be on or off. Switch it fast enough, though, and it can pretend to be anything in between.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Only on or off?',
        body: [
          'An output pin is digital: 5 V or 0 V, and nothing in between. So how do you dim an LED, or run a motor at half speed?',
          'You cheat. You switch the pin on and off hundreds of times a second. If it’s on for half the time, the LED gets half the energy and looks dimmer. This trick is called PWM.',
        ],
        term: { name: 'PWM (pulse-width modulation)', plain: 'Switching a pin on and off very fast, and changing how long it stays on, to fake an in-between level.' },
      },
      {
        kind: 'try',
        title: 'Slow it down',
        prompt: 'Drag the slider to change how long the pin stays on in each cycle. Turn on slow motion to see what’s really happening. Then set the LED to about a quarter power (20–30%).',
        widget: 'pwm',
        goal: { event: 'pwm-explored', label: 'Use slow motion, and set 20–30%' },
        reveal: 'In slow motion you can see the LED is only ever fully on or fully off. At normal speed the pin switches about 490 times a second, which is too fast for your eyes, so they blend it into a dimmer glow.',
      },
      {
        kind: 'talk',
        title: 'Duty cycle and analogWrite',
        body: [
          'The fraction of the time the pin is on is called the duty cycle. 0% is always off, 100% is always on, and 25% is on for a quarter of every cycle.',
          'In code you write analogWrite(pin, value), where the value goes from 0 (0%) to 255 (100%). Only pins marked with a ~ can do it. The same trick sets the speed of a motor and the angle of a servo, which you’ll use in the Robotics Lab.',
        ],
        term: { name: 'Duty cycle', plain: 'The percentage of each cycle that a PWM pin spends switched on.' },
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'You write analogWrite(9, 128). Roughly what does pin 9 do?',
        options: [
          { text: 'It sits at a steady 2.5 V', correct: false, feedback: 'It’s still a digital pin, so it never sits at 2.5 V. It switches between 5 V and 0 V, and only the average is 2.5 V.' },
          { text: 'It switches on and off very fast, on about half the time', correct: true, feedback: 'Yes. 128 out of 255 is about 50%, so on average it’s like 2.5 V, and an LED looks dimmer.' },
          { text: 'It turns on for 128 milliseconds', correct: false, feedback: 'The number sets how much of each cycle is on, not a time in milliseconds.' },
        ],
      },
    ],
  },
]

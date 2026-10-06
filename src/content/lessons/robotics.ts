import type { Lesson } from '../types'

export const ROBOTICS_LESSONS: Lesson[] = [
  // ——— Level 6: Sensors & Inputs ———
  {
    id: 'sensors',
    levelN: 6,
    hubId: 'robotics',
    title: 'Sensors: how robots feel the world',
    summary: 'What a sensor is, and the four ways sensors pass what they measure to a microcontroller.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Turning the world into signals',
        body: [
          'A robot’s microcontroller only understands voltages. A sensor is a part that turns something in the real world, like light, heat, distance or rotation, into an electrical signal.',
          'You’ve already used two. A button turns “pressed” into 5 V or 0 V. A knob turns a position into a voltage between 0 and 5 V.',
        ],
        term: { name: 'Sensor', plain: 'A part that turns something physical (light, heat, distance, movement) into an electrical signal.' },
      },
      {
        kind: 'talk',
        title: 'Four ways a sensor can answer',
        body: [
          'Analog voltage: the voltage itself is the measurement, like the knob or a temperature sensor. You read it with analogRead.',
          'On or off: just HIGH or LOW, like a button or a bump switch. You read it with digitalRead.',
          'Pulses: the timing or number of pulses is the measurement, like an ultrasonic distance sensor or a wheel encoder.',
          'Data: cleverer sensors have their own small chip and send the measurement as numbers over a couple of wires.',
        ],
      },
      {
        kind: 'try',
        title: 'Sort the sensors',
        prompt: 'For each sensor, pick how it sends its measurement to the microcontroller.',
        widget: 'sensor-sort',
        goal: { event: 'sorted', label: 'Sort all six sensors' },
        reveal: 'Knowing how a sensor answers tells you which pin to wire it to and which code to use: analogRead for an analog voltage, digitalRead for on/off, timing or counting for pulses, and a library for data.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Your robot needs to know how far its wheels have turned. Which sensor do you use?',
        options: [
          { text: 'A light sensor', correct: false, feedback: 'That measures brightness, not rotation.' },
          { text: 'A wheel encoder', correct: true, feedback: 'Yes. It sends a pulse for every slot that passes, so counting pulses tells you how far the wheel has turned.' },
          { text: 'A temperature sensor', correct: false, feedback: 'That measures heat, not movement.' },
        ],
      },
    ],
  },
  {
    id: 'light-sensor',
    levelN: 6,
    hubId: 'robotics',
    title: 'Seeing light: the LDR',
    summary: 'A resistor that changes with light, and the voltage divider that lets a microcontroller read it.',
    minutes: 4,
    xp: 40,
    steps: [
      {
        kind: 'talk',
        title: 'A resistor that reacts to light',
        body: [
          'An LDR (light-dependent resistor) is a resistor whose value falls as light gets brighter. In a dim room it might be 50 kΩ, and under a bright lamp only 2 kΩ.',
          'But a microcontroller can’t measure resistance, only voltage. The trick is the voltage divider from Level 4: put the LDR in series with a fixed resistor, and the voltage in the middle moves as the light changes.',
        ],
        term: { name: 'LDR (light-dependent resistor)', plain: 'A resistor whose resistance drops as more light falls on it.' },
      },
      {
        kind: 'try',
        title: 'Pick the best partner resistor',
        prompt: 'Change the light, and try each fixed resistor. Find the one that gives the biggest change in the A0 reading between dim and bright.',
        widget: 'light-sensor',
        goal: { event: 'best-swing', label: 'Find the resistor with the biggest swing' },
        reveal: 'The best fixed resistor is about the same as the LDR’s middle value, here 10 kΩ. Too small and the middle voltage hugs 0 V; too big and it hugs 5 V. Either way, a change in light barely moves it.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'With the LDR between 5V and A0, and 10 kΩ from A0 to GND, what happens to the A0 reading when you shine a torch on the LDR?',
        options: [
          { text: 'It goes up', correct: true, feedback: 'Yes. The LDR’s resistance falls, so it takes a smaller share of the 5 V and A0 rises towards 5 V.' },
          { text: 'It goes down', correct: false, feedback: 'The LDR’s resistance falls in bright light, so it takes a smaller share of the voltage, and the middle point rises.' },
          { text: 'It stays the same', correct: false, feedback: 'The divider changes because one of its resistors changed.' },
        ],
      },
    ],
  },
  {
    id: 'ultrasonic',
    levelN: 6,
    hubId: 'robotics',
    title: 'Seeing with sound',
    summary: 'How an ultrasonic sensor measures distance by timing an echo, like a bat.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Click, and listen',
        body: [
          'An ultrasonic sensor has two little round “eyes”. One is a speaker and the other a microphone. It sends a short click of sound, too high-pitched for you to hear, then times how long the echo takes to come back.',
          'Sound travels at about 343 metres per second, or 0.0343 cm every microsecond. The microcontroller times the echo and works out the distance.',
        ],
        term: { name: 'Ultrasonic sensor', plain: 'A distance sensor that times how long an echo of high-pitched sound takes to return.' },
      },
      {
        kind: 'try',
        title: 'Ping the wall',
        prompt: 'Move the wall, then press Ping. Watch the sound go out and come back, and measure three different distances. Then try moving the wall very far away.',
        widget: 'ultrasonic',
        goal: { event: 'pinged-3', label: 'Measure three different distances' },
        reveal: 'The sound travels to the wall and back, so the distance is the echo time × 0.0343 ÷ 2. Beyond about 4 m the echo is too faint to hear, and the sensor reports 0. Remember that: it will matter when your robot explores a big room.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'The echo takes 1166 µs to come back. How far away is the wall?',
        options: [
          { text: 'About 20 cm', correct: true, feedback: 'Yes: 1166 × 0.0343 = 40 cm there and back, so 20 cm away.' },
          { text: 'About 40 cm', correct: false, feedback: 'That’s the whole trip. The sound went there and back, so halve it.' },
          { text: 'About 2 cm', correct: false, feedback: 'Check the multiplication: 1166 × 0.0343 is about 40.' },
        ],
      },
    ],
  },
  {
    id: 'talking-chips',
    levelN: 6,
    hubId: 'robotics',
    title: 'When sensors send numbers',
    summary: 'How chips send data as ones and zeros: serial (UART) and I²C.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Some sensors are computers too',
        body: [
          'Clever sensors, like an accelerometer that knows which way is down or a GPS that knows where it is, have their own small chip inside. Instead of a voltage, they send the answer as a number.',
          'They send it one bit at a time: HIGH for 1, LOW for 0, switched at an agreed speed. It’s just a digital signal, very fast.',
        ],
      },
      {
        kind: 'try',
        title: 'Send some letters',
        prompt: 'Pick a letter and press Send. Watch the bits go out on the wire, slowed right down. Send three letters.',
        widget: 'uart',
        goal: { event: 'sent-3', label: 'Send three letters' },
        reveal: 'Each letter is a number (A is 65) sent as 8 bits, with a start bit before and a stop bit after so the receiver knows where it begins and ends. This is exactly how your serial monitor gets its numbers from the board.',
      },
      {
        kind: 'talk',
        title: 'UART and I²C',
        body: [
          'Serial, or UART, uses two wires: TX (transmit) on one chip goes to RX (receive) on the other. It connects exactly two chips, like the board and your computer, or a GPS module.',
          'I²C uses two wires as well: SDA carries data and SCL carries a clock that keeps everyone in step. Many chips can share the same two wires, because each has its own address, a bit like house numbers on one street.',
        ],
        term: { name: 'I²C and UART', plain: 'Two common ways for chips to send data. UART links two chips; I²C lets many chips share two wires, each with an address.' },
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'You want to connect three data sensors using only two wires. Which do you use?',
        options: [
          { text: 'I²C', correct: true, feedback: 'Yes. Each sensor has its own address, so all three share the SDA and SCL wires.' },
          { text: 'UART', correct: false, feedback: 'UART links just two chips. Three sensors would need three pairs of wires.' },
          { text: 'Three analog pins', correct: false, feedback: 'Data sensors send numbers, not a voltage you can read with analogRead.' },
        ],
      },
    ],
  },

  // ——— Level 7: Motors & Outputs ———
  {
    id: 'dc-motors',
    levelN: 7,
    hubId: 'robotics',
    title: 'How motors move',
    summary: 'What spins a DC motor, why its speed follows the voltage, and why a stalled motor is dangerous.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Electricity into movement',
        body: [
          'Inside a DC motor are coils of wire next to magnets. Current through a coil makes it a magnet too, and the push and pull between them spins the shaft. Reverse the current and it spins the other way.',
          'More voltage means more speed. A small gearbox, like the yellow one on robot motors, trades some of that speed for strength.',
        ],
        term: { name: 'DC motor', plain: 'A motor that spins when DC current flows through it. Its speed follows the voltage, and swapping its wires reverses it.' },
      },
      {
        kind: 'try',
        title: 'Load it up',
        prompt: 'Turn the voltage up, then try each load. Finish by stalling the motor at 5 V or more and watch the current.',
        widget: 'motor-load',
        goal: { event: 'stalled', label: 'Stall the motor at 5 V or more' },
        reveal: 'A spinning motor acts a little like a generator and pushes back against the battery, which keeps its current low. Stop it turning and that push-back disappears, so the current jumps to the battery voltage ÷ the coil’s resistance. That’s the stall current, and it’s the number your driver, battery and fuse must survive.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Your robot drives into a wall and its wheels stop turning, but the motors are still switched on. What happens to the current?',
        options: [
          { text: 'It jumps to its maximum', correct: true, feedback: 'Yes. A stalled motor draws its stall current, which can overheat the driver or the motor if it goes on for long.' },
          { text: 'It drops to zero', correct: false, feedback: 'It’s the other way round. The motor stops generating the voltage that pushed back against the battery, so more current flows.' },
          { text: 'It stays the same', correct: false, feedback: 'The load changed a lot, and the current follows the load.' },
        ],
      },
    ],
  },
  {
    id: 'h-bridge',
    levelN: 7,
    hubId: 'robotics',
    title: 'The H-bridge',
    summary: 'Four switches that let a microcontroller run a motor forwards or backwards.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Swapping the wires without touching them',
        body: [
          'To reverse a motor you need to swap its connections to the battery. Four switches round the motor, arranged in an H shape, can do that.',
          'Close the top-left and bottom-right switches, and current flows through the motor one way. Close the other two, and it flows the other way. In a motor driver, the switches are MOSFETs, the electronic switches from the Components Lab.',
        ],
        term: { name: 'H-bridge', plain: 'Four switches arranged round a motor so current can be sent through it in either direction.' },
      },
      {
        kind: 'try',
        title: 'Drive it both ways',
        prompt: 'Click the switches to open and close them. Make the motor spin forwards, then backwards. Careful which pairs you close!',
        widget: 'h-bridge',
        goal: { event: 'both-ways', label: 'Spin the motor both ways' },
        reveal: 'Diagonal pairs spin the motor. Closing both switches on the same side connects battery + straight to GND: a short circuit called shoot-through. A motor driver chip makes that impossible, which is why you send it EN and DIR instead of controlling four switches yourself.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'What happens if both switches on the left side of an H-bridge close at once?',
        options: [
          { text: 'The battery is short-circuited', correct: true, feedback: 'Yes: battery + to GND through two closed switches, with nothing to limit the current.' },
          { text: 'The motor spins at double speed', correct: false, feedback: 'No current goes through the motor at all. It all takes the shortcut.' },
          { text: 'The motor reverses', correct: false, feedback: 'Reversing needs the other diagonal pair.' },
        ],
      },
    ],
  },
  {
    id: 'servos-steppers',
    levelN: 7,
    hubId: 'robotics',
    title: 'Servos and steppers',
    summary: 'Two motors for precise positions: one points where you tell it, the other moves in exact steps.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'When position matters more than speed',
        body: [
          'A servo turns to an angle and holds it. The length of a pulse, sent every 20 ms, sets the angle: 1 ms for 0°, 2 ms for 180°.',
          'A stepper motor has several coils. Switch them on one after another and the shaft moves one exact step each time, often 1.8°, so 200 steps make a full turn. Count the steps and you know exactly where it is, with no sensor at all.',
        ],
        term: { name: 'Stepper motor', plain: 'A motor that moves in exact, equal steps when its coils are switched on in sequence.' },
      },
      {
        kind: 'try',
        title: 'Point and step',
        prompt: 'Set the servo pulse to point the arm at 0°, 90° and 180°. Then step the stepper motor round a full turn.',
        widget: 'servo-pulse',
        goal: { event: 'both', label: 'Hit all three angles and turn the stepper once' },
        reveal: 'The servo checks its own position and corrects itself. The stepper just trusts that every step happened. That’s why 3D printers can lose their place if a stepper is pushed too hard: it skips steps without knowing.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'A 3D printer has to move its nozzle in exact 0.1 mm steps, many times across a long rail. Which motor fits best?',
        options: [
          { text: 'A stepper motor', correct: true, feedback: 'Yes. Exact steps, and it can keep turning as far as it needs to.' },
          { text: 'A servo', correct: false, feedback: 'A hobby servo only turns about 180°, which isn’t enough to travel along a rail.' },
          { text: 'A plain DC motor', correct: false, feedback: 'It would need an encoder and a control loop to know where it is.' },
        ],
      },
    ],
  },

  // ——— Level 8: Power Systems ———
  {
    id: 'power-budget',
    levelN: 8,
    hubId: 'robotics',
    title: 'Power budget: how long will it run?',
    summary: 'Add up what every part draws, and pick a battery that lasts long enough.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Add it all up',
        body: [
          'Every part of a robot draws some current. Add them up and you get the total that the battery has to supply.',
          'Remember capacity from Level 1: a 2000 mAh battery can supply 2000 mA for an hour, or 1000 mA for two. Divide capacity by the total current to estimate the running time, then knock off about 20%, because batteries don’t like being drained completely.',
        ],
        term: { name: 'Power budget', plain: 'A list of every part’s current, added up, to choose a battery and predict how long it lasts.' },
      },
      {
        kind: 'try',
        title: 'Plan the robot’s battery',
        prompt: 'Switch on everything the robot carries, then choose a battery that keeps it running for at least 2 hours.',
        widget: 'power-budget',
        goal: { event: 'budget-ok', label: 'Everything on, running 2 hours or more' },
        reveal: 'The motors use far more than the brain and sensors put together. That’s typical: if a robot runs out too soon, the motors and their gearing are where to look first.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Which part usually uses most of a small robot’s battery?',
        options: [
          { text: 'The drive motors', correct: true, feedback: 'Yes. Moving a robot takes far more energy than thinking about it.' },
          { text: 'The microcontroller', correct: false, feedback: 'It draws around 50 mA. Each drive motor typically uses several times that.' },
          { text: 'The sensors', correct: false, feedback: 'Most sensors draw only a few milliamps.' },
        ],
      },
    ],
  },
  {
    id: 'regulators',
    levelN: 8,
    hubId: 'robotics',
    title: 'Steady voltage for the brain',
    summary: 'Why a robot needs a voltage regulator, and the difference between linear and switching ones.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Batteries wobble, brains don’t like it',
        body: [
          'A battery’s voltage isn’t steady. It drops as the battery runs down, and it dips every time the motors pull hard. A microcontroller needs a steady 5 V; if it dips too low, the board resets in the middle of what it was doing.',
          'A voltage regulator takes a higher, wobbly voltage in and gives a steady one out.',
        ],
        term: { name: 'Voltage regulator', plain: 'A part that turns a higher, changing voltage into a steady, lower one.' },
      },
      {
        kind: 'try',
        title: 'Test two regulators',
        prompt: 'Try the linear regulator: lower the battery voltage until the board resets, then turn the voltage and the load up and feel the heat. Then switch to the switching regulator and compare.',
        widget: 'regulator',
        goal: { event: 'regulator-explored', label: 'Cause a reset, overheat the linear one, then try the switching one' },
        reveal: 'A linear regulator burns off the extra voltage as heat: (voltage in − voltage out) × current. It also needs about 2 V of headroom. A switching regulator chops and smooths the power instead, wasting only about 10%, which is why robots with big batteries usually use one.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'A linear regulator gets 12 V in and supplies 0.5 A at 5 V. How much power does it turn into heat?',
        options: [
          { text: '3.5 W', correct: true, feedback: 'Yes: (12 − 5) × 0.5 = 3.5 W. That’s enough to burn a finger without a heatsink.' },
          { text: '6 W', correct: false, feedback: 'That’s 12 × 0.5, all the power going in. Only the extra 7 V is wasted.' },
          { text: '2.5 W', correct: false, feedback: 'That’s the useful power, 5 × 0.5. The heat comes from the 7 V it drops.' },
        ],
      },
    ],
  },
  {
    id: 'protection',
    levelN: 8,
    hubId: 'robotics',
    title: 'Fuses and backwards batteries',
    summary: 'Two cheap parts that save a robot from the two most common disasters.',
    minutes: 4,
    xp: 40,
    steps: [
      {
        kind: 'talk',
        title: 'Two ways to destroy a robot',
        body: [
          'A wire rubs through its insulation and touches the frame: a short circuit. A big battery can push tens of amps into it, and things melt or catch fire.',
          'Someone plugs the battery in backwards. Chips are only built to take voltage one way round, and they die instantly.',
          'A fuse in the battery lead melts before anything else can be damaged. A diode in series (the one-way door from the Components Lab) simply refuses to let backwards current through.',
        ],
        term: { name: 'Reverse-polarity protection', plain: 'A part, often a diode, that stops a circuit being damaged if the battery is connected backwards.' },
      },
      {
        kind: 'try',
        title: 'Break it, then protect it',
        prompt: 'Try both disasters without protection. Then fit the fuse and the diode, and try them again.',
        widget: 'protection',
        goal: { event: 'protected', label: 'Survive both disasters' },
        reveal: 'The fuse sacrifices itself and is cheap to replace. The diode costs you about 0.7 V all the time, which is why bigger robots use a MOSFET for the same job: it wastes far less.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Where should a robot’s main fuse go?',
        options: [
          { text: 'In the battery lead, as close to the battery as possible', correct: true, feedback: 'Yes. Then a short anywhere in the robot’s wiring is between the fuse and the fault.' },
          { text: 'Next to the motors', correct: false, feedback: 'A short in the wiring before the motors would still be unprotected.' },
          { text: 'On the microcontroller’s 5V pin', correct: false, feedback: 'That protects only the board, not the battery wiring and motors.' },
        ],
      },
    ],
  },

  // ——— Level 9: Build a Robot Brain ———
  {
    id: 'block-diagrams',
    levelN: 9,
    hubId: 'robotics',
    title: 'Block diagrams: the big picture',
    summary: 'Draw the whole robot as boxes and arrows before choosing a single part.',
    minutes: 5,
    xp: 50,
    steps: [
      {
        kind: 'talk',
        title: 'Boxes before parts',
        body: [
          'Engineers start a design with a block diagram: one box for each job, and arrows showing what flows between them.',
          'Two kinds of thing flow round a robot. Power flows from the battery out to everything. Signals flow from the sensors, through the microcontroller, out to the motor driver.',
        ],
        term: { name: 'Block diagram', plain: 'A drawing of a system as boxes (jobs) and arrows (power or signals flowing between them).' },
      },
      {
        kind: 'try',
        title: 'Draw your robot',
        prompt: 'Click a block, then the block it feeds, to draw an arrow. Connect up the whole robot: power from the battery, and signals from the sensor to the motors.',
        widget: 'block-diagram',
        goal: { event: 'diagram-done', label: 'Make all seven connections' },
        reveal: 'Every part you’ve met has a place: the fuse and regulator from Level 8, the sensor from Level 6, the microcontroller from Level 5 and the driver and motors from Level 7. This diagram is the first step of your final project.',
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'Why does the motor driver take its power from the battery, not from the regulator?',
        options: [
          { text: 'The motors need far more current than the regulator can supply', correct: true, feedback: 'Yes. The regulator only feeds the brain and sensors. Motor current goes straight from the battery, through the driver.' },
          { text: 'The regulator’s voltage is too high', correct: false, feedback: 'The regulator gives a lower voltage than the battery. The problem is current.' },
          { text: 'It makes no difference', correct: false, feedback: 'Motor current through a small regulator would overheat it, and the dips would reset the brain.' },
        ],
      },
    ],
  },
  {
    id: 'control-loops',
    levelN: 9,
    hubId: 'robotics',
    title: 'Control loops: sense, decide, act',
    summary: 'Why “drive until the sensor says stop” beats “drive for two seconds”, and how to stop smoothly.',
    minutes: 6,
    xp: 60,
    steps: [
      {
        kind: 'talk',
        title: 'Open loop and closed loop',
        body: [
          'Open loop means acting without checking: “drive forward for two seconds”. If the floor is slippery or the battery is low, the robot ends up somewhere else, and it never knows.',
          'Closed loop means measuring the result and correcting: “drive until the sensor says 20 cm”. Sense, decide, act, then sense again, many times a second. You did exactly this with the encoder in Experiment 10.',
        ],
        term: { name: 'Control loop', plain: 'Sense, decide and act, over and over, using each new measurement to correct what you do next.' },
      },
      {
        kind: 'try',
        title: 'Park 20 cm from the wall',
        prompt: 'Try “stop at 20 cm” first and watch where the robot ends up. Then switch to proportional control and adjust the gain until it parks smoothly at 20 cm.',
        widget: 'control-loop',
        goal: { event: 'parked', label: 'Park within 1 cm of 20 cm using proportional control' },
        reveal: 'Stopping at a line ignores momentum, so the robot overshoots. Proportional control slows down as it gets close. Too little gain is slow; too much and it behaves like on/off again and overshoots. Tuning the gain is a real engineering job.',
      },
      {
        kind: 'talk',
        title: 'Proportional control',
        body: [
          'Proportional control sets the speed in proportion to the error, the distance still to go: speed = gain × (distance − target).',
          'Far away, the error is big, so it drives fast. Close to the target, the error shrinks, so it slows down. If it overshoots, the error goes negative and it backs up. That one line of code is behind cruise control, drones that hover, and your robot’s smooth stops.',
        ],
        term: { name: 'Proportional control', plain: 'Making the correction bigger the further you are from the target, and smaller as you get close.' },
      },
      {
        kind: 'check',
        title: 'Quick check',
        question: 'A robot uses speed = 2 × (distance − 20). It’s 30 cm from the wall. What speed does it choose?',
        options: [
          { text: '20', correct: true, feedback: 'Yes: 2 × (30 − 20) = 20. At 25 cm it would choose 10, and at 20 cm it stops.' },
          { text: '60', correct: false, feedback: 'That’s 2 × 30. The formula uses the error, distance − 20.' },
          { text: '0', correct: false, feedback: 'It’s still 10 cm from its target, so it keeps moving.' },
        ],
      },
    ],
  },
]

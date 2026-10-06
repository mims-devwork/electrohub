# ElectroHub

An interactive electronics and robotics lab that teaches from absolute zero. The goal is that a complete beginner can design the electronics and PCB for their own small robot.

Instead of a course made of articles, ElectroHub is a virtual lab. Learners walk a 3D lab of "stations" (Electricity → Components → Circuits → Microcontroller → Robotics → PCB → Robot). They learn by touching, wiring, breaking and fixing things.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulator + content tests
npm run build      # typecheck + production build (static, hash-routed: host anywhere)
```

## What's in this first version (vertical slice)

| Area | What you can do |
| --- | --- |
| **3D Lab (home)** | Explore hub stations in 3D, follow the glowing learning path, see where you are and what to do next. |
| **Electricity Lab: Level 1** | 8 short lessons (loop, voltage, current & resistance, power, ground, AC/DC, batteries, safety). Each uses a hands-on widget. The 3D test loop has a clickable knife switch, voltage and resistance sliders, animated electrons and conventional-current arrows. |
| **Components Lab: Level 2** | 22 components modelled in 3D (later levels add the potentiometer, the microcontroller board, sensors, motors, a motor driver and power parts). Rotate them and click numbered hotspots. Each answers *What is it? → What does it do? → Why do we need it? → Where is it used?* and shows its schematic symbol. There's also a component collection. |
| **Circuit Lab: Level 3** | A wiring bench backed by a real circuit solver. Experiments 01–03: light an LED (and burn it out), change the resistor, and a button-controlled LED. There's also a free-build bench. |
| **Microcontroller Lab: Levels 4–5** | Six lessons (signals, voltage dividers, potentiometers, meet the microcontroller, your first program, PWM), each with a hands-on widget. A microcontroller bench: wire parts to a board's pins, edit the program, and watch the serial monitor and a signal scope. Experiments 04–06: read a potentiometer, a button and LED controlled by code (with a floating-input bug to fix), and a knob-controlled PWM dimmer. There's also a free-play board with two programs. |
| **Robotics Lab: Levels 6–9** | Twelve lessons: sensors, light sensors (LDR), ultrasonic distance, UART and I²C, DC motors and stall current, the H-bridge, servos and steppers, power budgets, regulators, fuses and reverse-polarity protection, block diagrams and control loops. Experiments 07–10 on the board bench: a temperature sensor (wire it, calibrate it, make a thermostat), a servo steered by a knob, a DC motor through an H-bridge driver with its own battery (and a common-ground bug), and a wheel encoder that stops on a pulse count. Experiment 11 runs in a robot arena: tune an obstacle-avoiding robot until it stops crashing, then fix the "0 means no echo" bug in a big hall. There's also a 3D free-play robot with a live block diagram, and a power kit to collect. |
| **Debugging as learning** | Short circuits, reversed LEDs, missing resistors, too little voltage, overheating resistors and open loops are all explained as **what happened → why → how to fix it**. |
| **Progression** | 12 levels, abilities unlocked per level, XP and ranks, locked lab areas (with "peek anyway"), a skill map and a progress page. Progress is saved in `localStorage`. |
| **Path ahead** | A working preview of the PCB Lab (Physical circuit ↔ Schematic ↔ 3D PCB, with net highlighting, layers and vias). The Project Bay shows the capstone milestones. |

## Architecture

```
src/
  content/          ← all learning content as plain data (no UI)
    lessons/*.ts      lessons: talk / try (widget + goal event) / check steps
    experiments.ts    experiments: starting circuit + steps with declarative goals
    components.ts     component catalog (what/does/why/where, hotspots, symbol)
    levels.ts         12 levels → items (lesson / experiment / collect) + capstone
    hubs.ts           lab areas and their unlock levels
  sim/              ← the electronics engine (framework-free, unit tested)
    solve.ts          nodal-analysis DC solver (Norton batteries, piecewise LEDs)
    diagnose.ts       turns results into "what / why / fix" explanations
    goals.ts          declarative experiment goals + history tracking
  circuit/          ← the Circuit Lab bench (SVG): drag, wire, inspect, animate current
  micro/            ← the board bench: engine (incl. sensors, motors, H-bridge, batteries), programs, goals, lab notes
  robot/            ← the robot arena: top-down robot simulation, its program, goals and bench
  three/            ← React Three Fiber: procedural component models, lab scene, viewer
  widgets/          ← interactive lesson widgets, looked up by id from lesson data
  pages/            ← screens; previews/ holds the future-hub demos
  lib/progression.ts← unlock rules, "what next?", ranks
  store/            ← zustand stores (persisted progress, session peeks)
```

The idea is that content is data and screens are generic. A lesson never imports a React component; it names a widget (`widget: 'flow-loop'`) and an event to wait for (`goal: { event: 'voltage-high' }`). An experiment describes a starting circuit and goals such as `{ type: 'ledCurrent', minmA: 8, maxmA: 12 }`. The simulator decides whether the learner got there.

### Adding things

- **A lesson:** add an entry to `src/content/lessons/*.ts`, then list it in a level's `items` in `levels.ts`.
- **A lesson widget:** create `src/widgets/MyWidget.tsx` (props: `onEvent`, `props`), add its id to `WidgetId` in `content/types.ts`, and register it in `widgets/registry.tsx`.
- **An experiment:** add it to `experiments.ts` with `status: 'ready'`, a `setup` circuit and `steps`. If you need a new kind of goal, add it to `sim/goals.ts`. `content.test.ts` checks the experiment is actually solvable, so add a case there too.
- **A robot-arena experiment:** give it `bench: 'robot'` and a `RobotSetup` (which arena, starting code). The simulation is in `robot/sim.ts` and the program in `robot/program.ts`; `robot/robot.test.ts` checks it's solvable.
- **A microcontroller experiment:** give it `bench: 'micro'` and a `MicroSetup` (parts, wires, which program runs, scope pins). Programs live in `micro/programs.ts` as display code plus a small TypeScript `run` function; slots are the bits of code the learner can edit. Goals are in `micro/goals.ts`, and `micro/micro.test.ts` checks each experiment is solvable.
- **A component:** add a catalog entry in `components.ts` and a model in `three/models.tsx` (`MODEL_BY_ID`). Hotspot coordinates use the model's local space.
- **A new hub (e.g. turning the Robotics preview into real levels):** set the hub's `status: 'open'`, give its levels `status: 'ready'` with items, and add its page in `pages/HubPage.tsx`.
- **New circuit parts (e.g. motors, potentiometers):** add a `PartKind` in `sim/types.ts` and its definition in `sim/parts.ts`, stamp it in `sim/solve.ts`, draw it in `circuit/PartGlyph.tsx`, and add diagnostics in `sim/diagnose.ts`.

### Simulator notes

- Every terminal is a node, and every wire is a tiny resistor. That way the current in each individual wire is known and can be animated.
- Batteries have internal resistance, so a short circuit produces a large but finite current, which gets flagged.
- LEDs are modelled as "off" or "forward voltage + 15 Ω", and the solver iterates until each LED's state is consistent. An LED pushed past 50 mA glows white-hot for about half a second and then burns out (`burnt` stays set until the learner replaces it).
- Current flow can be shown as conventional current (+ → −) or as electrons (− → +). The speed of the animation scales with the current.
- The microcontroller bench (`micro/engine.ts`) uses the same nodal approach. The 5V pin and output pins are sources with a little internal resistance, input pins draw nothing, and a net no source can reach is *floating*: `analogRead` drifts and `digitalRead` flickers, just like a real unconnected pin. PWM outputs are solved HIGH and LOW and averaged by the duty cycle. Shorting 5V to GND trips the board's fuse, and an output pin driven past 40 mA is flagged.
- Robot parts use the same solver. A battery pack is another source; a motor is a 6 Ω load whose shaft speed lags behind its voltage (so it coasts); the motor driver is an H-bridge of four switches, guessed and re-solved like an LED, and it only obeys EN and DIR when its GND is connected to the board's. Encoder pulses are counted on D2 as interrupts, from the motor's actual speed.
- The robot arena simulates a two-wheeled robot in centimetres: wheel speeds with momentum, an ultrasonic beam as wide as the robot that reports 0 beyond 4 m, and bumps that count as crashes.

## Tech

React 19 · TypeScript · Vite · Tailwind CSS v4 · Three.js via React Three Fiber + drei · zustand · react-router (hash routing).
All 3D models are procedural, and labels are drawn on canvas. The app makes no asset downloads, apart from Google Fonts with a system-font fallback.

import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Html, Rod, StudioEnvironment } from '../../three/common'
import { ButtonModel, LedModel, ResistorModel } from '../../three/models'
import { DevBoard } from '../../three/props'
import { SectionTitle } from '../../ui/primitives'

type Program = 'follow' | 'toggle'

const PROGRAMS: Record<Program, { name: string; lines: { code: string; tag?: string }[] }> = {
  follow: {
    name: 'LED follows the button',
    lines: [
      { code: 'void loop() {' },
      { code: '  if (digitalRead(2) == HIGH) {', tag: 'read' },
      { code: '    digitalWrite(13, HIGH);  // LED on', tag: 'on' },
      { code: '  } else {' },
      { code: '    digitalWrite(13, LOW);   // LED off', tag: 'off' },
      { code: '  }' },
      { code: '}' },
    ],
  },
  toggle: {
    name: 'Press to toggle',
    lines: [
      { code: 'bool on = false;' },
      { code: 'void loop() {' },
      { code: '  if (justPressed(2)) {', tag: 'read' },
      { code: '    on = !on;               // flip it', tag: 'flip' },
      { code: '  }' },
      { code: '  digitalWrite(13, on);', tag: 'write' },
      { code: '}' },
    ],
  },
}

function Board3D({ pressed, ledOn, onPress }: { pressed: boolean; ledOn: boolean; onPress: (p: boolean) => void }) {
  const high = '#fbbf24'
  const low = '#334155'
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 4.2, 4.6], fov: 40 }}>
      <color attach="background" args={['#0b1120']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 6, 3]} intensity={1.2} castShadow />
      <StudioEnvironment />
      <group position={[0, 0, -0.4]}>
        <DevBoard ledOn={ledOn} />
        <Html position={[0.0, 0.3, -1.15]} center zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] text-fog-200">pins D2 · D13 · GND</div>
        </Html>
      </group>
      {/* button on D2 */}
      <group
        position={[-1.3, 0, 1.6]}
        scale={0.6}
        onPointerDown={(e) => {
          e.stopPropagation()
          onPress(true)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <ButtonModel pressed={pressed} />
        <Html position={[0, 1.4, 0]} center zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded bg-ink-950/80 px-1.5 py-0.5 text-[11px] text-fog-200">Hold me</div>
        </Html>
      </group>
      {/* LED + resistor on D13 */}
      <group position={[1.5, 0.3, 1.6]} scale={0.45}>
        <LedModel color="green" brightness={ledOn ? 0.9 : 0} />
      </group>
      <group position={[0.5, 0.08, 1.6]} scale={0.3} rotation={[0, 0, 0]}>
        <ResistorModel ohms={220} />
      </group>
      {/* signal wires: glow when HIGH */}
      <Rod from={[-1.3, 0.25, 1.4]} to={[-0.6, 0.25, -1.3]} radius={0.035} color={pressed ? high : low} metal={false} />
      <Rod from={[1.4, 0.25, 1.4]} to={[0.9, 0.25, -1.3]} radius={0.035} color={ledOn ? high : low} metal={false} />
      <mesh position={[0, -0.05, 0.5]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <ContactShadows position={[0, -0.04, 0]} opacity={0.4} scale={8} blur={2} />
      <OrbitControls enablePan={false} enableZoom={false} minDistance={4} maxDistance={9} maxPolarAngle={1.3} makeDefault />
    </Canvas>
  )
}

function Scope({ history }: { history: { d2: number; d13: number }[] }) {
  const W = 400
  const row = (key: 'd2' | 'd13', y: number) =>
    history.map((h, i) => `${(i / Math.max(1, history.length - 1)) * W},${y - h[key] * 26}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} 110`} className="w-full rounded-lg bg-ink-950">
      <text x="6" y="16" fill="#8a9bb8" fontSize="10">
        D2 (input)
      </text>
      <text x="6" y="70" fill="#8a9bb8" fontSize="10">
        D13 (output)
      </text>
      <polyline points={row('d2', 46)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      <polyline points={row('d13', 100)} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
    </svg>
  )
}

/** Free play: one board, one button, one LED, and two programs to swap between. */
export function MicroPlayground() {
  const [program, setProgram] = useState<Program>('follow')
  const [pressed, setPressed] = useState(false)
  const [toggled, setToggled] = useState(false)
  const [history, setHistory] = useState<{ d2: number; d13: number }[]>(() => Array(80).fill({ d2: 0, d13: 0 }))
  const ledOn = program === 'follow' ? pressed : toggled
  const prevPressed = useRef(false)

  useEffect(() => {
    if (pressed && !prevPressed.current && program === 'toggle') setToggled((t) => !t)
    prevPressed.current = pressed
  }, [pressed, program])

  useEffect(() => {
    const up = () => setPressed(false)
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const state = useRef({ pressed, ledOn })
  state.current = { pressed, ledOn }
  useEffect(() => {
    const t = setInterval(() => setHistory((h) => [...h.slice(1), { d2: state.current.pressed ? 1 : 0, d13: state.current.ledOn ? 1 : 0 }]), 60)
    return () => clearInterval(t)
  }, [])

  const activeTags = program === 'follow' ? ['read', pressed ? 'on' : 'off'] : ['read', pressed ? 'flip' : '', 'write']

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <SectionTitle eyebrow="Free play" title="Software controlling hardware">
          A button is wired to pin 2 and an LED to pin 13. The wires never change, but the program decides what pressing the button actually does. Swap programs and try it.
        </SectionTitle>
        <div className="relative h-[420px] overflow-hidden rounded-2xl border border-ink-700">
          <Board3D pressed={pressed} ledOn={ledOn} onPress={setPressed} />
          <button
            onPointerDown={() => setPressed(true)}
            className={`absolute bottom-3 left-3 rounded-lg border px-4 py-2 text-sm font-medium ${pressed ? 'border-volt bg-volt text-ink-950' : 'border-ink-500 bg-ink-900/90 text-fog-100'}`}
          >
            {pressed ? 'Pressed (pin 2 = HIGH)' : 'Press & hold button'}
          </button>
        </div>
      </div>
      <div className="grid min-w-0 content-start gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="panel min-w-0 p-4">
          <div className="flex gap-1.5">
            {(Object.keys(PROGRAMS) as Program[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setProgram(p)
                  setToggled(false)
                }}
                className={`rounded-md border px-2.5 py-1 text-xs ${program === p ? 'border-brain bg-brain/15 text-brain' : 'border-ink-600 text-fog-400 hover:text-fog-100'}`}
              >
                {PROGRAMS[p].name}
              </button>
            ))}
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[12.5px] leading-6">
            {PROGRAMS[program].lines.map((l, i) => (
              <div key={i} className={`rounded px-1 transition-colors ${l.tag && activeTags.includes(l.tag) ? 'bg-brain/20 text-fog-100' : 'text-fog-400'}`}>
                {l.code}
              </div>
            ))}
          </pre>
          <p className="mt-2 text-xs text-fog-400">Highlighted lines are the ones running right now. The loop repeats thousands of times a second.</p>
        </div>
        <div className="panel p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fog-400">Digital signals over time</div>
          <Scope history={history} />
          <p className="mt-2 text-xs text-fog-400">Digital means just two states: HIGH (about 5 V) or LOW (0 V). Notice how the output follows the input differently depending on the program.</p>
        </div>
      </div>
    </div>
  )
}

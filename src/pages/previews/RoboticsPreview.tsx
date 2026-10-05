import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { StudioEnvironment } from '../../three/common'
import { MiniRobot } from '../../three/props'
import { SectionTitle } from '../../ui/primitives'

const HALF = 4.6
const PILLARS = [
  { x: 1.6, z: -1.2, r: 0.6 },
  { x: -2.0, z: 1.6, r: 0.7 },
]
const CM_PER_UNIT = 25
const RANGE = 4

interface RobotState {
  x: number
  z: number
  heading: number
  mode: 'forward' | 'turning' | 'stuck'
  turnDir: 1 | -1
  cm: number
  left: number
  right: number
}

function castRay(x: number, z: number, heading: number): number {
  const fx = Math.sin(heading)
  const fz = Math.cos(heading)
  let best = RANGE
  const walls = [fx > 1e-6 ? (HALF - x) / fx : Infinity, fx < -1e-6 ? (-HALF - x) / fx : Infinity, fz > 1e-6 ? (HALF - z) / fz : Infinity, fz < -1e-6 ? (-HALF - z) / fz : Infinity]
  for (const t of walls) if (t >= 0 && t < best) best = t
  for (const p of PILLARS) {
    const ox = x - p.x
    const oz = z - p.z
    const b = ox * fx + oz * fz
    const c = ox * ox + oz * oz - p.r * p.r
    const disc = b * b - c
    if (disc >= 0) {
      const t = -b - Math.sqrt(disc)
      if (t >= 0 && t < best) best = t
    }
  }
  return best
}

function blocked(x: number, z: number) {
  const r = 0.55
  if (Math.abs(x) > HALF - r || Math.abs(z) > HALF - r) return true
  return PILLARS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + r)
}

function Arena({ stateRef, threshold, sensorOn, paused }: { stateRef: React.RefObject<RobotState>; threshold: number; sensorOn: boolean; paused: boolean }) {
  const robot = useRef<THREE.Group>(null)
  const ray = useRef<THREE.Mesh>(null)
  const rayMat = useRef<THREE.MeshBasicMaterial>(null)
  const [wheels, setWheels] = useState({ l: 0, r: 0 })

  useFrame((_, rawDt) => {
    const s = stateRef.current
    if (!s) return
    const dt = Math.min(rawDt, 0.05)
    const sx = s.x + Math.sin(s.heading) * 0.5
    const sz = s.z + Math.cos(s.heading) * 0.5
    const dist = castRay(sx, sz, s.heading)
    s.cm = sensorOn ? dist * CM_PER_UNIT : NaN
    if (!paused) {
      // ——— the robot brain: sensor → decision → motors ———
      if (!sensorOn) {
        s.mode = blocked(s.x + Math.sin(s.heading) * 0.05, s.z + Math.cos(s.heading) * 0.05) ? 'stuck' : 'forward'
      } else if (s.mode !== 'turning' && s.cm < threshold) {
        const leftSpace = castRay(sx, sz, s.heading + 0.8)
        const rightSpace = castRay(sx, sz, s.heading - 0.8)
        s.turnDir = leftSpace >= rightSpace ? 1 : -1
        s.mode = 'turning'
      } else if (s.mode === 'turning' && s.cm > threshold * 1.5) {
        s.mode = 'forward'
      } else if (s.mode === 'stuck') {
        s.mode = 'forward'
      }
      if (s.mode === 'forward') {
        s.left = 1
        s.right = 1
        const nx = s.x + Math.sin(s.heading) * 1.4 * dt
        const nz = s.z + Math.cos(s.heading) * 1.4 * dt
        if (!blocked(nx, nz)) {
          s.x = nx
          s.z = nz
        } else {
          s.mode = sensorOn ? 'turning' : 'stuck'
        }
      }
      if (s.mode === 'turning') {
        s.left = -s.turnDir
        s.right = s.turnDir
        s.heading += s.turnDir * 2.2 * dt
      }
      if (s.mode === 'stuck') {
        s.left = 1
        s.right = 1
      }
    }
    if (robot.current) {
      robot.current.position.set(s.x, 0, s.z)
      robot.current.rotation.y = s.heading
    }
    if (ray.current && rayMat.current) {
      const len = sensorOn ? dist : 0.001
      ray.current.scale.set(1, len, 1)
      ray.current.position.set(0, 0.36, 0.5 + len / 2)
      rayMat.current.color.set(s.cm < threshold ? '#f43f5e' : '#34d399')
    }
    const l = paused || s.mode === 'stuck' ? 0 : s.left * 9
    const r = paused || s.mode === 'stuck' ? 0 : s.right * 9
    if (l !== wheels.l || r !== wheels.r) setWheels({ l, r })
  })

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color="#111a2e" />
      </mesh>
      <gridHelper args={[HALF * 2, 18, '#1f2d4d', '#16213a']} position={[0, 0.005, 0]} />
      {[
        [0, HALF, HALF * 2 + 0.3, 0.3],
        [0, -HALF, HALF * 2 + 0.3, 0.3],
        [HALF, 0, 0.3, HALF * 2],
        [-HALF, 0, 0.3, HALF * 2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.3, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.6, d]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      {PILLARS.map((p, i) => (
        <mesh key={i} position={[p.x, 0.5, p.z]} castShadow>
          <cylinderGeometry args={[p.r, p.r, 1, 32]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      ))}
      <group ref={robot}>
        <group scale={0.5}>
          <MiniRobot leftSpeed={wheels.l} rightSpeed={wheels.r} sensorGlow={sensorOn ? 1 : 0} />
        </group>
        <mesh ref={ray} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
          <meshBasicMaterial ref={rayMat} color="#34d399" transparent opacity={0.8} />
        </mesh>
      </group>
    </>
  )
}

function Block({ icon, title, value, active, color }: { icon: string; title: string; value: string; active?: boolean; color: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-2 transition-colors"
      style={{ borderColor: active ? color : 'var(--color-ink-600)', background: active ? `color-mix(in oklab, ${color} 12%, transparent)` : 'var(--color-ink-900)' }}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-fog-100">
        <span aria-hidden>{icon}</span>
        {title}
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-fog-300">{value}</div>
    </div>
  )
}

const Arrow = ({ active }: { active?: boolean }) => (
  <div className={`text-center text-sm leading-none ${active ? 'text-volt' : 'text-ink-500'}`} aria-hidden>
    ↓
  </div>
)

export function RoboticsPreview() {
  const stateRef = useRef<RobotState>({ x: -1, z: -2.5, heading: 0.3, mode: 'forward', turnDir: 1, cm: 100, left: 1, right: 1 })
  const [threshold, setThreshold] = useState(35)
  const [sensorOn, setSensorOn] = useState(true)
  const [paused, setPaused] = useState(false)
  const [view, setView] = useState({ cm: 100, mode: 'forward' as RobotState['mode'], left: 1, right: 1 })

  useEffect(() => {
    const t = setInterval(() => {
      const s = stateRef.current
      setView({ cm: s.cm, mode: s.mode, left: s.left, right: s.right })
    }, 120)
    return () => clearInterval(t)
  }, [])

  const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
  const decision = !sensorOn
    ? 'No sensor data → keep driving forward'
    : view.mode === 'turning'
      ? `Wall at ${Math.round(view.cm)} cm < ${threshold} cm → TURN`
      : `Clear (${Math.round(view.cm)} cm) → DRIVE FORWARD`

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <SectionTitle eyebrow="Preview · Levels 6–9" title="How a robot actually works">
          Sensor → microcontroller → decision → motor driver → motors, running live. This is Experiment 09, the obstacle-avoiding robot, and you’ll build the electronics for it yourself.
        </SectionTitle>
        <div className="relative h-[440px] overflow-hidden rounded-2xl border border-ink-700">
          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 7.6, 6.4], fov: 45 }}>
            <color attach="background" args={['#070b14']} />
            <ambientLight intensity={0.45} />
            <directionalLight position={[4, 10, 5]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
            <StudioEnvironment />
            <Arena stateRef={stateRef} threshold={threshold} sensorOn={sensorOn} paused={paused} />
            <OrbitControls enablePan={false} enableZoom={false} minDistance={6} maxDistance={16} maxPolarAngle={1.3} makeDefault />
          </Canvas>
        </div>
        <div className="panel grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <div className="flex justify-between text-xs text-fog-300">
              <span>Decision rule: turn when a wall is closer than</span>
              <span className="font-mono text-volt">{threshold} cm</span>
            </div>
            <input type="range" min={10} max={80} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="mt-2 w-full" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSensorOn((v) => !v)} className={`rounded-lg border px-3 py-1.5 text-xs ${sensorOn ? 'border-ink-600 text-fog-200' : 'border-danger bg-danger/15 text-rose-200'}`}>
              {sensorOn ? 'Unplug the sensor' : 'Plug sensor back in'}
            </button>
            <button onClick={() => setPaused((p) => !p)} className="rounded-lg border border-ink-600 px-3 py-1.5 text-xs text-fog-200">
              {paused ? '▶ Run' : '❚❚ Pause'}
            </button>
          </div>
        </div>
        {!sensorOn && <p className="text-sm text-warn">Without a sensor, the brain has no information, so it can’t decide anything. The robot just drives until it hits something and the motors stall. That draws a lot of current, which is why motor drivers need protection.</p>}
      </div>
      <div className="space-y-1.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fog-400">Live block diagram</div>
        <Block icon="🔋" title="Battery" value="7.4 V Li-ion pack" active color="#fbbf24" />
        <Arrow active />
        <Block icon="⚡" title="Voltage regulator" value="7.4 V → steady 5 V for the brain" active color="#fbbf24" />
        <Arrow active />
        <Block icon="📡" title="Distance sensor" value={sensorOn ? `${Math.round(view.cm)} cm` : 'unplugged'} active={sensorOn} color="#38bdf8" />
        <Arrow active={sensorOn} />
        <Block icon="🧠" title="Microcontroller" value={decision} active color="#a78bfa" />
        <Arrow active />
        <Block icon="🔀" title="Motor driver" value={`L ${pct(view.left)} · R ${pct(view.right)}`} active color="#f472b6" />
        <Arrow active />
        <Block icon="⚙️" title="Motors + wheels" value={view.mode === 'turning' ? 'spinning opposite ways → turn' : view.mode === 'stuck' ? 'stalled against wall!' : 'both forward → drive'} active color="#f472b6" />
        <p className="pt-2 text-xs text-fog-400">The microcontroller can’t power motors directly, because its pins give only a few milliamps. The motor driver is a set of MOSFET switches that lets the weak signal control the battery’s big current.</p>
      </div>
    </div>
  )
}

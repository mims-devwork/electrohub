import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Html, StudioEnvironment } from '../three/common'
import { Meter } from '../ui/primitives'
import type { WidgetProps } from './types'

const R_BULB = 6
const LOOP_LEFT = -2.6
const LOOP_RIGHT = 2.6
const LOOP_TOP = 1.5
const LOOP_BOTTOM = -1.3
const GAP = 0.45

/** Clockwise path (the direction conventional current flows), leaving a gap for the switch. */
function loopPoints(): THREE.Vector3[] {
  const r = 0.35
  const pts: THREE.Vector3[] = []
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8
      pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0))
    }
  }
  pts.push(new THREE.Vector3(-GAP, LOOP_BOTTOM, 0))
  arc(LOOP_LEFT + r, LOOP_BOTTOM + r, -Math.PI / 2, -Math.PI) // bottom-left
  arc(LOOP_LEFT + r, LOOP_TOP - r, Math.PI, Math.PI / 2) // top-left
  arc(LOOP_RIGHT - r, LOOP_TOP - r, Math.PI / 2, 0) // top-right
  arc(LOOP_RIGHT - r, LOOP_BOTTOM + r, 0, -Math.PI / 2) // bottom-right
  pts.push(new THREE.Vector3(GAP, LOOP_BOTTOM, 0))
  return pts
}

interface SimState {
  current: number
  bulbPower: number
  resistorPower: number
  closed: boolean
}

function Electrons({ curve, sim, electrons }: { curve: THREE.Curve<THREE.Vector3>; sim: SimState; electrons: boolean }) {
  const COUNT = 72
  const mesh = useRef<THREE.InstancedMesh>(null)
  const phase = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }, dt) => {
    // Electrons move − → + through the wires: anticlockwise, opposite to conventional current.
    phase.current -= Math.min(dt, 0.05) * sim.current * 0.12
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < COUNT; i++) {
      const u = (((i / COUNT + phase.current) % 1) + 1) % 1
      const p = curve.getPointAt(u)
      const jitter = 0.025
      const t = clock.elapsedTime * 9 + i * 13.7
      dummy.position.set(p.x + Math.sin(t) * jitter, p.y + Math.cos(t * 1.3) * jitter, p.z + 0.02)
      dummy.scale.setScalar(electrons ? 1 : 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.055, 10, 8]} />
      <meshStandardMaterial color="#3b8bff" emissive="#1d64ff" emissiveIntensity={0.9} />
    </instancedMesh>
  )
}

function ConventionalArrows({ curve, sim, visible }: { curve: THREE.Curve<THREE.Vector3>; sim: SimState; visible: boolean }) {
  const COUNT = 14
  const mesh = useRef<THREE.InstancedMesh>(null)
  const phase = useRef(0)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  useFrame((_, dt) => {
    phase.current += Math.min(dt, 0.05) * sim.current * 0.12
    const m = mesh.current
    if (!m) return
    for (let i = 0; i < COUNT; i++) {
      const u = (((i / COUNT + phase.current) % 1) + 1) % 1
      const p = curve.getPointAt(u)
      const tan = curve.getTangentAt(u)
      dummy.position.set(p.x, p.y, 0.18)
      dummy.quaternion.setFromUnitVectors(up, tan)
      dummy.scale.setScalar(visible && sim.current > 0.001 ? 1 : 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
      <coneGeometry args={[0.09, 0.24, 12]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
    </instancedMesh>
  )
}

function KnifeSwitch({ closed, onToggle }: { closed: boolean; onToggle: () => void }) {
  const blade = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!blade.current) return
    const target = closed ? 0 : 1.0
    blade.current.rotation.z += (target - blade.current.rotation.z) * Math.min(1, dt * 12)
  })
  const [hover, setHover] = useState(false)
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh position={[0, LOOP_BOTTOM - 0.16, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.1, 0.6]} />
        <meshStandardMaterial color={hover ? '#334155' : '#1e293b'} roughness={0.6} />
      </mesh>
      {[-GAP, GAP].map((x) => (
        <mesh key={x} position={[x, LOOP_BOTTOM - 0.02, 0]}>
          <boxGeometry args={[0.12, 0.22, 0.2]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <group ref={blade} position={[-GAP, LOOP_BOTTOM + 0.04, 0]} rotation={[0, 0, closed ? 0 : 1]}>
        <mesh position={[GAP, 0, 0]} castShadow>
          <boxGeometry args={[GAP * 2 + 0.1, 0.05, 0.12]} />
          <meshStandardMaterial color="#d4d8de" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[GAP * 2 + 0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.3, 16]} />
          <meshStandardMaterial color="#e11d48" roughness={0.4} />
        </mesh>
      </group>
      {/* generous invisible hit area */}
      <mesh position={[0, LOOP_BOTTOM + 0.2, 0.1]} visible={false}>
        <boxGeometry args={[1.6, 1.0, 0.8]} />
      </mesh>
      <Html position={[0, LOOP_BOTTOM - 0.55, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md bg-ink-950/80 px-2 py-0.5 text-[11px] text-fog-200">
          Switch: <span className={closed ? 'text-ok' : 'text-warn'}>{closed ? 'closed' : 'open'}</span>
        </div>
      </Html>
    </group>
  )
}

function Bulb({ power }: { power: number }) {
  const b = Math.min(1, power / 12)
  return (
    <group position={[0, LOOP_TOP, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.35, 24]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.46, 32, 24]} />
        <meshStandardMaterial color="#fff7e0" transparent opacity={0.28 + b * 0.5} roughness={0.05} emissive="#ffc861" emissiveIntensity={b * 2.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#5b4636" emissive="#ffb347" emissiveIntensity={b * 8} />
      </mesh>
      {b > 0.01 && (
        <>
          <pointLight position={[0, 0.7, 0.4]} color="#ffcf7a" intensity={b * 18} distance={8} decay={2} />
          <mesh position={[0, 0.7, 0]}>
            <sphereGeometry args={[1.1, 24, 16]} />
            <meshBasicMaterial color="#ffcf7a" transparent opacity={0.16 * b} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function Battery({ voltage }: { voltage: number }) {
  return (
    <group position={[LOOP_LEFT, 0.1, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 1.5, 32]} />
        <meshStandardMaterial color="#18181b" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.425, 0.425, 0.5, 32]} />
        <meshStandardMaterial color="#b9802f" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.14, 20]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.3} />
      </mesh>
      <Html position={[0.75, 0.55, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none text-lg font-bold text-volt">+</div>
      </Html>
      <Html position={[0.75, -0.55, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none select-none text-lg font-bold text-flow">−</div>
      </Html>
      <Html position={[-0.95, 0, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md bg-ink-950/80 px-2 py-0.5 font-mono text-xs text-volt">{voltage.toFixed(1)} V</div>
      </Html>
    </group>
  )
}

function LoopResistor({ ohms, power }: { ohms: number; power: number }) {
  const glow = Math.min(1, power / 6)
  return (
    <group position={[LOOP_RIGHT, 0.1, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.24, 0.24, 1.0, 24]} />
        <meshStandardMaterial color="#d8c39b" roughness={0.6} emissive="#ff4d0a" emissiveIntensity={glow * 1.6} />
      </mesh>
      {[-0.3, -0.1, 0.1, 0.32].map((y, i) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.245, 0.245, 0.08, 24]} />
          <meshStandardMaterial color={['#7a4a1e', '#111', '#111', '#c9a227'][i]} />
        </mesh>
      ))}
      {glow > 0.05 && <pointLight position={[0.3, 0, 0.4]} color="#ff6a1a" intensity={glow * 5} distance={3} />}
      <Html position={[0.95, 0, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md bg-ink-950/80 px-2 py-0.5 font-mono text-xs text-fog-200">{ohms} Ω</div>
      </Html>
    </group>
  )
}

function Scene({ sim, voltage, rExtra, showResistor, onToggle, electrons, conventional }: {
  sim: SimState
  voltage: number
  rExtra: number
  showResistor: boolean
  onToggle: () => void
  electrons: boolean
  conventional: boolean
}) {
  const { openCurve, closedCurve } = useMemo(() => {
    const pts = loopPoints()
    return { openCurve: new THREE.CatmullRomCurve3(pts, false, 'centripetal'), closedCurve: new THREE.CatmullRomCurve3(pts, true, 'centripetal') }
  }, [])
  return (
    <>
      <color attach="background" args={['#0b1120']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 5, 6]} intensity={1.2} castShadow />
      <StudioEnvironment />
      <mesh>
        <tubeGeometry args={[openCurve, 260, 0.075, 10, false]} />
        <meshStandardMaterial color="#d08b4a" metalness={0.8} roughness={0.35} transparent opacity={0.55} />
      </mesh>
      <Electrons curve={closedCurve} sim={sim} electrons={electrons} />
      <ConventionalArrows curve={closedCurve} sim={sim} visible={conventional} />
      <Battery voltage={voltage} />
      <Bulb power={sim.bulbPower} />
      {showResistor && <LoopResistor ohms={rExtra} power={sim.resistorPower} />}
      <KnifeSwitch closed={sim.closed} onToggle={onToggle} />
      <mesh position={[0, -1.6, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      <OrbitControls enablePan={false} enableZoom={false} minDistance={5} maxDistance={11} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.9} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} makeDefault />
    </>
  )
}

export function FlowLoop({ onEvent, props = {} }: WidgetProps) {
  const controls = (props.controls as string[] | undefined) ?? []
  const target = props.targetCurrent as number | undefined
  const targetPower = props.targetPower as number | undefined
  const [voltage, setVoltage] = useState((props.voltage as number) ?? 6)
  const [rExtra, setRExtra] = useState((props.resistance as number) ?? 0)
  const [closed, setClosed] = useState((props.switchClosed as boolean) ?? false)
  const [electrons, setElectrons] = useState(true)
  const [conventional, setConventional] = useState(false)
  const showResistor = controls.includes('resistance')

  const total = R_BULB + (showResistor ? rExtra : 0)
  const current = closed ? voltage / total : 0
  const sim: SimState = { current, bulbPower: current * current * R_BULB, resistorPower: showResistor ? current * current * rExtra : 0, closed }
  const power = current * voltage

  const simRef = useRef(sim)
  simRef.current = sim

  useEffect(() => {
    onEvent(closed ? 'switch-closed' : 'switch-opened')
  }, [closed])
  useEffect(() => {
    if (voltage >= 9) onEvent('voltage-high')
    if (voltage === 0) onEvent('voltage-zero')
  }, [voltage])
  useEffect(() => {
    if (target !== undefined && closed && Math.abs(current - target) < 0.0101) onEvent('current-target')
    if (targetPower !== undefined && closed && sim.bulbPower >= targetPower) onEvent('power-target')
  }, [current, closed])

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
      <div className="relative h-[340px] sm:h-[400px]">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.3, 8], fov: 42 }}>
          <Scene
            sim={simRef.current}
            voltage={voltage}
            rExtra={rExtra}
            showResistor={showResistor}
            onToggle={() => setClosed((c) => !c)}
            electrons={electrons}
            conventional={conventional}
          />
        </Canvas>
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <button
            onClick={() => setElectrons((v) => !v)}
            className={`rounded-md border px-2 py-1 text-[11px] ${electrons ? 'border-flow/60 bg-flow/15 text-flow' : 'border-ink-600 text-fog-400'}`}
          >
            ● Electrons
          </button>
          <button
            onClick={() => setConventional((v) => !v)}
            className={`rounded-md border px-2 py-1 text-[11px] ${conventional ? 'border-volt/60 bg-volt/15 text-volt' : 'border-ink-600 text-fog-400'}`}
          >
            ▲ Conventional current
          </button>
        </div>
        {(electrons || conventional) && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 text-[11px] leading-snug text-fog-400 sm:right-auto sm:max-w-sm">
            {conventional && electrons
              ? 'Electrons (blue) actually drift from − to +. Engineers draw current (yellow) the other way, from + to −. It’s a historical convention, and both describe the same flow.'
              : electrons
                ? 'Real electrons crawl along slower than a snail. We’ve sped them up a lot so you can see them. The push itself travels round the loop almost instantly.'
                : 'Conventional current: by agreement, engineers draw current flowing from + to −.'}
          </div>
        )}
      </div>
      <div className="grid gap-3 border-t border-ink-700 p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {controls.includes('voltage') && (
            <label className="block">
              <div className="flex justify-between text-xs text-fog-300">
                <span>Voltage (push)</span>
                <span className="font-mono text-volt">{voltage.toFixed(1)} V</span>
              </div>
              <input type="range" min={0} max={12} step={0.5} value={voltage} onChange={(e) => setVoltage(+e.target.value)} className="mt-2 w-full" aria-label="Voltage" />
            </label>
          )}
          {showResistor && (
            <label className="block">
              <div className="flex justify-between text-xs text-fog-300">
                <span>Resistor (difficulty)</span>
                <span className="font-mono text-fog-100">{rExtra} Ω</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={rExtra}
                onChange={(e) => setRExtra(+e.target.value)}
                className="mt-2 w-full"
                style={{ ['--thumb' as string]: 'var(--color-fog-200)' }}
                aria-label="Resistance"
              />
            </label>
          )}
          {controls.length === 0 && <p className="text-sm text-fog-300">Click the switch on the bench to open or close it.</p>}
          {target !== undefined && (
            <p className="text-xs text-fog-400">
              Target: <span className="font-mono text-volt">{target.toFixed(2)} A</span>. The bulb itself is {R_BULB} Ω, so the total resistance is {R_BULB} + {rExtra} = {total} Ω.
            </p>
          )}
          {targetPower !== undefined && (
            <p className="text-xs text-fog-400">
              Target: bulb power ≥ <span className="font-mono text-volt">{targetPower} W</span>. Bulb now: <span className="font-mono">{sim.bulbPower.toFixed(1)} W</span>, resistor:{' '}
              <span className="font-mono text-warn">{sim.resistorPower.toFixed(1)} W</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-[330px]">
          <Meter label="Voltage" value={voltage.toFixed(1)} unit="V" color="var(--color-volt)" />
          <Meter label="Current" value={current.toFixed(2)} unit="A" color="var(--color-flow)" />
          <Meter label="Power" value={power.toFixed(1)} unit="W" color="var(--color-warn)" />
        </div>
      </div>
    </div>
  )
}

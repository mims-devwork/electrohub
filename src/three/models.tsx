import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ComponentType } from 'react'
import * as THREE from 'three'
import { LED_SPECS } from '../sim/parts'
import type { LedColor } from '../sim/types'
import { Lead, METAL, Rod, useLabelTexture } from './common'
import { DevBoard } from './props'

// Procedural component models. Convention: bodies sit around y = 0…1.6 and
// legs point down towards y ≈ −1, centred on x = 0. Hotspot coordinates in
// src/content/components.ts follow the same layout.

export const BAND_COLORS = ['#111111', '#7a4a1e', '#d42a2a', '#f07c1a', '#f5d02a', '#2e9e48', '#2a62d4', '#8a3cc9', '#8e8e8e', '#f2f2f2']
export const BAND_NAMES = ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Grey', 'White']

/** Colour-code digits for a resistor value: [digit1, digit2, multiplierExponent]. */
export function resistorDigits(ohms: number): [number, number, number] {
  let exp = 0
  let v = ohms
  while (v >= 100) {
    v /= 10
    exp++
  }
  while (v < 10 && exp > -2) {
    v *= 10
    exp--
  }
  const r = Math.round(v)
  return [Math.floor(r / 10), r % 10, exp]
}

export function ResistorModel({ ohms = 470, glow = 0 }: { ohms?: number; glow?: number }) {
  const [d1, d2, m] = resistorDigits(ohms)
  const bands = [BAND_COLORS[d1], BAND_COLORS[d2], m >= 0 ? BAND_COLORS[m] : '#c9a227', '#c9a227']
  const xs = [-0.42, -0.2, 0.02, 0.4]
  return (
    <group>
      <Lead points={[[-1.2, -1, 0], [-1.2, 0.6, 0], [-0.6, 0.6, 0]]} />
      <Lead points={[[0.6, 0.6, 0], [1.2, 0.6, 0], [1.2, -1, 0]]} />
      <group position={[0, 0.6, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.23, 0.23, 1.0, 24]} />
          <meshStandardMaterial color="#d8c39b" roughness={0.6} emissive="#ff5a1a" emissiveIntensity={glow * 1.2} />
        </mesh>
        {[-0.52, 0.52].map((x) => (
          <mesh key={x} position={[x, 0, 0]} scale={[0.7, 1, 1]} castShadow>
            <sphereGeometry args={[0.29, 24, 16]} />
            <meshStandardMaterial color="#d8c39b" roughness={0.6} emissive="#ff5a1a" emissiveIntensity={glow * 1.2} />
          </mesh>
        ))}
        {bands.map((c, i) => (
          <mesh key={i} position={[xs[i], 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[i === 0 ? 0.296 : 0.236, i === 0 ? 0.296 : 0.236, 0.09, 24]} />
            <meshStandardMaterial color={c} roughness={0.5} metalness={i === 3 ? 0.6 : 0} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function flangeGeometry() {
  const shape = new THREE.Shape()
  const r = 0.6
  const chordX = 0.5
  const t0 = Math.acos(chordX / r)
  shape.absarc(0, 0, r, t0, Math.PI * 2 - t0, false)
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 32 })
  geo.rotateX(-Math.PI / 2)
  return geo
}

export function LedModel({ color = 'red', brightness = 0, burnt = false }: { color?: LedColor; brightness?: number; burnt?: boolean }) {
  const hex = LED_SPECS[color].hex
  const flange = useMemo(flangeGeometry, [])
  const tint = burnt ? new THREE.Color(hex).lerp(new THREE.Color('#2a1d16'), 0.65) : new THREE.Color(hex)
  const b = burnt ? 0 : brightness
  return (
    <group>
      <Lead points={[[-0.25, 0.1, 0], [-0.25, -1.3, 0]]} />
      <Lead points={[[0.25, 0.1, 0], [0.25, -0.9, 0]]} />
      {/* internals: anode post and cathode anvil holding the die */}
      <mesh position={[-0.2, 0.5, 0]}>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.15, 0.45, 0]}>
        <boxGeometry args={[0.2, 0.65, 0.08]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.1, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.08]} />
        <meshStandardMaterial color={burnt ? '#111' : hex} emissive={hex} emissiveIntensity={b * 6} />
      </mesh>
      <mesh geometry={flange} castShadow>
        <meshStandardMaterial color={tint} transparent opacity={0.75} roughness={0.25} emissive={hex} emissiveIntensity={b * 0.8} />
      </mesh>
      <mesh position={[0, 0.57, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.86, 32, 1, true]} />
        <meshStandardMaterial color={tint} transparent opacity={0.45 + b * 0.3} roughness={0.15} emissive={hex} emissiveIntensity={b * 1.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={tint} transparent opacity={0.45 + b * 0.3} roughness={0.15} emissive={hex} emissiveIntensity={b * 1.6} depthWrite={false} />
      </mesh>
      {b > 0.02 && (
        <>
          <pointLight position={[0, 1.0, 0]} color={hex} intensity={b * 6} distance={6} decay={2} />
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.95, 24, 16]} />
            <meshBasicMaterial color={hex} transparent opacity={0.12 * b} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}
      {burnt && <Smoke position={[0, 1.6, 0]} />}
    </group>
  )
}

function Smoke({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    group.current?.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1
      c.position.set(Math.sin(t * 6 + i) * 0.15, t * 1.4, 0)
      c.scale.setScalar(0.15 + t * 0.4)
      ;((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - t)
    })
  })
  return (
    <group ref={group} position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#8b8b8b" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function CapacitorModel() {
  return (
    <group>
      <Lead points={[[-0.2, 0, 0], [-0.2, -1.1, 0]]} />
      <Lead points={[[0.2, 0, 0], [0.2, -0.8, 0]]} />
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 1.4, 40]} />
        <meshStandardMaterial color="#1d3f9a" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.506, 0.506, 1.38, 40, 1, true, Math.PI / 2 - 0.42, 0.84]} />
        <meshStandardMaterial color="#cdd5e3" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {[0.3, 0.72, 1.14].map((y) => (
        <mesh key={y} position={[0.512, y, 0]}>
          <boxGeometry args={[0.01, 0.04, 0.16]} />
          <meshStandardMaterial color="#1d3f9a" />
        </mesh>
      ))}
      <mesh position={[0, 1.425, 0]}>
        <cylinderGeometry args={[0.47, 0.47, 0.02, 40]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {[0, Math.PI / 2].map((r) => (
        <mesh key={r} position={[0, 1.44, 0]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.7, 0.012, 0.03]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function DiodeModel() {
  return (
    <group>
      <Lead points={[[-1.1, -1, 0], [-1.1, 0.65, 0], [-0.4, 0.65, 0]]} />
      <Lead points={[[0.4, 0.65, 0], [1.1, 0.65, 0], [1.1, -1, 0]]} />
      <mesh position={[0, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.9, 24]} />
        <meshStandardMaterial color="#141414" roughness={0.35} />
      </mesh>
      <mesh position={[0.34, 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.205, 0.205, 0.12, 24]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  )
}

export function BatteryModel({ voltage = 9 }: { voltage?: number }) {
  const label = useLabelTexture(`${voltage} V`, { bg: '#18181b', fg: '#fbbf24', font: '700 56px Inter, system-ui, sans-serif' })
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1.0, 1.2, 0.6]} />
        <meshStandardMaterial color="#18181b" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.6]} />
        <meshStandardMaterial color="#b9802f" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.65, 0.301]}>
        <planeGeometry args={[0.9, 0.45]} />
        <meshStandardMaterial map={label} />
      </mesh>
      <mesh position={[0, 1.71, 0]}>
        <boxGeometry args={[1.0, 0.02, 0.6]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {/* + : small round snap. − : larger hexagonal snap */}
      <mesh position={[-0.25, 1.82, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.2, 20]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.25, 1.8, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.16, 6]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
    </group>
  )
}

export function SwitchModel({ closed = false }: { closed?: boolean }) {
  return (
    <group>
      <Lead points={[[-0.25, 0, 0], [-0.25, -0.8, 0]]} />
      <Lead points={[[0.25, 0, 0], [0.25, -0.8, 0]]} />
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 24]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <group position={[0, 0.75, 0]} rotation={[0, 0, closed ? -0.45 : 0.45]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 0.7, 16]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      </group>
    </group>
  )
}

export function ButtonModel({ pressed = false }: { pressed?: boolean }) {
  const legs: [number, number][] = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]
  return (
    <group>
      {legs.map(([sx, sz], i) => (
        <Lead key={i} radius={0.035} points={[[sx * 0.4, 0.1, sz * 0.3], [sx * 0.55, 0.1, sz * 0.3], [sx * 0.55, -0.6, sz * 0.3]]} />
      ))}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.9, 0.35, 0.9]} />
        <meshStandardMaterial color="#111827" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.86, 0.03, 0.86]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, pressed ? 0.43 : 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.25, 32]} />
        <meshStandardMaterial color="#e11d48" roughness={0.4} />
      </mesh>
    </group>
  )
}

export function TransistorModel() {
  return (
    <group>
      {[-0.25, 0, 0.25].map((x) => (
        <Lead key={x} points={[[x, 0.05, 0], [x, -1.1, 0]]} />
      ))}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.9, 32, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#141414" roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.76, 0.9, 0.01]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.5} />
      </mesh>
    </group>
  )
}

export function To220Model({ label = 'IRLZ44N' }: { label?: string }) {
  const tex = useLabelTexture(label, { bg: '#151515', fg: '#d4d4d8', font: '600 40px JetBrains Mono, monospace' })
  return (
    <group>
      {[-0.35, 0, 0.35].map((x) => (
        <mesh key={x} position={[x, -0.55, 0]}>
          <boxGeometry args={[0.09, 1.1, 0.03]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 0.42]} />
        <meshStandardMaterial color="#151515" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0.211]}>
        <planeGeometry args={[0.9, 0.42]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      <mesh position={[0, 1.2, -0.18]} castShadow>
        <boxGeometry args={[1.0, 0.75, 0.06]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 1.27, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.07, 24]} />
        <meshStandardMaterial color="#0b0f19" />
      </mesh>
    </group>
  )
}

export function RelayModel() {
  const tex = useLabelTexture('5V RELAY', { bg: '#1d4ed8', fg: '#e0e7ff', font: '700 36px Inter, sans-serif' })
  return (
    <group>
      {[
        [-0.5, -0.25],
        [-0.5, 0.25],
        [0.5, -0.25],
        [0.5, 0.25],
        [0, 0.25],
      ].map(([x, z], i) => (
        <Lead key={i} points={[[x, 0, z], [x, -0.6, z]]} />
      ))}
      {/* coil */}
      <mesh position={[-0.35, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.55, 24]} />
        <meshStandardMaterial color="#b87333" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* contacts */}
      <mesh position={[0.35, 0.55, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.2]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0.35, 0.42, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.2]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.4, 1.0, 0.85]} />
        <meshStandardMaterial color="#2563eb" transparent opacity={0.35} roughness={0.2} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.5]} />
        <meshStandardMaterial map={tex} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

export function ConnectorModel() {
  return (
    <group>
      {[-0.25, 0.25].map((x) => (
        <group key={x}>
          <Lead points={[[x, 0, 0], [x, -0.7, 0]]} radius={0.04} />
          <mesh position={[x, 0.92, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 24]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
          <mesh position={[x, 0.955, 0]}>
            <boxGeometry args={[0.26, 0.02, 0.04]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[x, 0.38, 0.401]}>
            <boxGeometry args={[0.24, 0.24, 0.01]} />
            <meshStandardMaterial color="#05140b" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.0, 0.9, 0.8]} />
        <meshStandardMaterial color="#15803d" roughness={0.5} />
      </mesh>
    </group>
  )
}

export function FuseModel() {
  return (
    <group>
      <Lead points={[[-1.1, -1, 0], [-1.1, 0.65, 0], [-0.75, 0.65, 0]]} />
      <Lead points={[[0.75, 0.65, 0], [1.1, 0.65, 0], [1.1, -1, 0]]} />
      <mesh position={[0, 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 1.1, 24, 1, true]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.25} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.24, 24]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <Rod from={[-0.5, 0.65, 0]} to={[0.5, 0.65, 0]} radius={0.012} color="#e5e7eb" />
    </group>
  )
}

export function PotModel() {
  const tex = useLabelTexture('103', { bg: '#1d4ed8', fg: '#e0e7ff', font: '700 44px JetBrains Mono, monospace' })
  return (
    <group>
      {[-0.32, 0, 0.32].map((x) => (
        <Lead key={x} points={[[x, 0.05, 0.25], [x, -1.0, 0.25]]} />
      ))}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.05, 0.5, 1.05]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.28, 0.535]}>
        <planeGeometry args={[0.62, 0.31]} />
        <meshStandardMaterial map={tex} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.42, 0.22, 40]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.28, 0.55, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} />
      </mesh>
      {/* pointer line showing where the wiper is */}
      <mesh position={[0.1, 1.26, -0.06]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.34, 0.02, 0.05]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  )
}

export const MODEL_BY_ID: Record<string, ComponentType> = {
  battery: () => <BatteryModel />,
  resistor: () => <ResistorModel ohms={470} />,
  led: () => <LedModel color="red" brightness={0.6} />,
  switch: () => <SwitchModel />,
  button: () => <ButtonModel />,
  capacitor: CapacitorModel,
  diode: DiodeModel,
  transistor: TransistorModel,
  mosfet: () => <To220Model label="IRLZ44N" />,
  relay: RelayModel,
  connector: ConnectorModel,
  fuse: FuseModel,
  regulator: () => <To220Model label="L7805" />,
  potentiometer: PotModel,
  microcontroller: () => (
    <group position={[0, -0.35, 0]}>
      <DevBoard ledOn />
    </group>
  ),
}

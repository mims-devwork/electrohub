import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { METAL, useLabelTexture } from './common'

/** Arduino-style development board. Origin at the board's centre, top surface at y ≈ 0.05. */
export function DevBoard({ ledOn = false, powerOn = true }: { ledOn?: boolean; powerOn?: boolean }) {
  const chip = useLabelTexture('MCU', { bg: '#141414', fg: '#9ca3af', font: '600 52px JetBrains Mono, monospace' })
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.08, 2.0]} />
        <meshStandardMaterial color="#0e6e8c" roughness={0.55} />
      </mesh>
      {/* header strips */}
      {[
        [0.25, -0.88, 1.9],
        [0.35, 0.88, 1.7],
      ].map(([x, z, len], i) => (
        <group key={i} position={[x, 0.12, z]}>
          <mesh castShadow>
            <boxGeometry args={[len, 0.18, 0.18]} />
            <meshStandardMaterial color="#111" roughness={0.6} />
          </mesh>
          {Array.from({ length: Math.round(len / 0.13) }, (_, k) => (
            <mesh key={k} position={[-len / 2 + 0.07 + k * 0.13, 0.091, 0]}>
              <boxGeometry args={[0.05, 0.01, 0.05]} />
              <meshStandardMaterial color="#d4a62a" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}
      {/* microcontroller chip */}
      <mesh position={[0.45, 0.1, 0.05]} castShadow>
        <boxGeometry args={[1.1, 0.1, 0.38]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh position={[0.45, 0.151, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshStandardMaterial map={chip} />
      </mesh>
      {Array.from({ length: 14 }, (_, k) => (
        <group key={k}>
          {[-0.21, 0.31].map((z) => (
            <mesh key={z} position={[-0.07 + k * 0.08, 0.07, z]}>
              <boxGeometry args={[0.03, 0.05, 0.06]} />
              <meshStandardMaterial {...METAL} />
            </mesh>
          ))}
        </group>
      ))}
      {/* USB + power jack */}
      <mesh position={[-1.25, 0.18, 0.45]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.45]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      <mesh position={[-1.2, 0.18, -0.55]} castShadow>
        <boxGeometry args={[0.55, 0.3, 0.35]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* on-board LEDs: ON (green) and L / pin 13 (amber) */}
      <mesh position={[-0.35, 0.07, -0.45]}>
        <boxGeometry args={[0.08, 0.05, 0.05]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={powerOn ? 3 : 0} />
      </mesh>
      <mesh position={[-0.35, 0.07, -0.3]}>
        <boxGeometry args={[0.08, 0.05, 0.05]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={ledOn ? 4 : 0} />
      </mesh>
      {ledOn && <pointLight position={[-0.35, 0.3, -0.3]} color="#f59e0b" intensity={1.5} distance={1.5} />}
    </group>
  )
}

/** Small two-wheeled robot. `speed` spins the wheels (rad/s, per side). */
export function MiniRobot({ leftSpeed = 0, rightSpeed = 0, sensorGlow = 0 }: { leftSpeed?: number; rightSpeed?: number; sensorGlow?: number }) {
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (left.current) left.current.rotation.x += leftSpeed * dt
    if (right.current) right.current.rotation.x += rightSpeed * dt
  })
  const wheel = (
    <>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.22, 28]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.24, 6]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.5} />
      </mesh>
    </>
  )
  return (
    <group>
      {/* chassis */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.5, 0.08, 2.0]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* motors */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.35]} castShadow>
          <boxGeometry args={[0.36, 0.26, 0.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.5} />
        </mesh>
      ))}
      <group ref={left} position={[-0.88, 0.42, 0.35]}>
        {wheel}
      </group>
      <group ref={right} position={[0.88, 0.42, 0.35]}>
        {wheel}
      </group>
      {/* caster */}
      <mesh position={[0, 0.12, -0.7]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
      {/* battery pack */}
      <mesh position={[0, 0.62, -0.45]} castShadow>
        <boxGeometry args={[0.9, 0.26, 0.6]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* brain board */}
      <mesh position={[0, 0.6, 0.35]} castShadow>
        <boxGeometry args={[1.0, 0.05, 0.75]} />
        <meshStandardMaterial color="#15803d" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.66, 0.35]}>
        <boxGeometry args={[0.3, 0.06, 0.3]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* distance sensor "eyes" */}
      <group position={[0, 0.72, 0.95]}>
        <mesh>
          <boxGeometry args={[0.9, 0.36, 0.05]} />
          <meshStandardMaterial color="#1d4ed8" />
        </mesh>
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.16, 24]} />
            <meshStandardMaterial {...METAL} emissive="#38bdf8" emissiveIntensity={sensorGlow} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** A small populated PCB for the lab station. */
export function PcbBoard() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.06, 1.6]} />
        <meshStandardMaterial color="#14532d" roughness={0.45} />
      </mesh>
      {[
        [[-0.9, -0.4], [0.2, -0.4]],
        [[0.2, -0.4], [0.2, 0.4]],
        [[-0.6, 0.5], [0.9, 0.5]],
        [[0.9, 0.5], [0.9, -0.3]],
      ].map(([a, b], i) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
        return (
          <mesh key={i} position={[(a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2]} rotation={[0, -ang, 0]}>
            <boxGeometry args={[len + 0.06, 0.01, 0.06]} />
            <meshStandardMaterial color="#d4a62a" metalness={0.8} roughness={0.35} />
          </mesh>
        )
      })}
      {[
        [-0.95, 0.65],
        [0.95, -0.65],
        [-0.95, -0.65],
        [0.95, 0.65],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.032, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.1, 20]} />
          <meshStandardMaterial color="#d4a62a" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.2, 0.1, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-0.6, 0.12, 0.1]} castShadow>
        <boxGeometry args={[0.3, 0.16, 0.5]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
    </group>
  )
}

/** Solderless breadboard with a couple of parts. */
export function Breadboard() {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.2, 1.4]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.101, 0]}>
        <boxGeometry args={[2.5, 0.005, 0.08]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {[-0.6, 0.6].map((z) => (
        <mesh key={z} position={[0, 0.102, z]}>
          <boxGeometry args={[2.4, 0.004, 0.03]} />
          <meshStandardMaterial color={z < 0 ? '#ef4444' : '#3b82f6'} />
        </mesh>
      ))}
    </group>
  )
}

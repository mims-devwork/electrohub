import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Hub, HubId } from '../content/types'
import { StudioEnvironment } from './common'
import { BatteryModel, CapacitorModel, LedModel, ResistorModel, To220Model } from './models'
import { Breadboard, DevBoard, MiniRobot, PcbBoard } from './props'

export interface StationInfo {
  hub: Hub
  unlocked: boolean
  progress: number
  isNext: boolean
}

const RADIUS = 6.2

export function stationPose(i: number, n: number) {
  const a = -1.0 + (2.0 * i) / (n - 1)
  return { x: Math.sin(a) * RADIUS, z: 2.6 - Math.cos(a) * RADIUS, rotY: -a }
}

function Pulse({ children, speed = 1 }: { children: React.ReactNode; speed?: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 * speed) * 0.35
  })
  return <group ref={g}>{children}</group>
}

function StationProp({ id }: { id: HubId }) {
  switch (id) {
    case 'electricity':
      return (
        <group>
          <group position={[-0.35, 0, 0]} scale={0.42}>
            <BatteryModel />
          </group>
          <group position={[0.4, 0.42, 0]} scale={0.4}>
            <LedModel color="red" brightness={0.7} />
          </group>
        </group>
      )
    case 'components':
      return (
        <Pulse>
          <group position={[-0.5, 0.35, 0]} scale={0.32}>
            <ResistorModel ohms={4700} />
          </group>
          <group position={[0.15, 0.38, 0]} scale={0.32}>
            <CapacitorModel />
          </group>
          <group position={[0.6, 0.38, 0]} scale={0.32}>
            <To220Model />
          </group>
        </Pulse>
      )
    case 'circuits':
      return (
        <group scale={0.55} position={[0, 0.06, 0]}>
          <Breadboard />
          <group position={[-0.4, 0.75, 0]} scale={0.55}>
            <ResistorModel ohms={470} />
          </group>
          <group position={[0.6, 0.85, 0]} scale={0.55}>
            <LedModel color="red" brightness={0.7} />
          </group>
        </group>
      )
    case 'microcontrollers':
      return (
        <group scale={0.55} position={[0, 0.06, 0]}>
          <DevBoard ledOn />
        </group>
      )
    case 'robotics':
      return (
        <Pulse speed={0.7}>
          <group scale={0.5}>
            <MiniRobot leftSpeed={2} rightSpeed={2} sensorGlow={0.6} />
          </group>
        </Pulse>
      )
    case 'pcb':
      return (
        <Pulse speed={0.6}>
          <group scale={0.6} position={[0, 0.1, 0]} rotation={[0.35, 0, 0]}>
            <PcbBoard />
          </group>
        </Pulse>
      )
    case 'projects':
      return (
        <group>
          <group scale={0.42} position={[-0.35, 0, 0]}>
            <MiniRobot />
          </group>
          <group scale={0.32} position={[0.55, 0.1, 0.1]} rotation={[0.4, -0.4, 0]}>
            <PcbBoard />
          </group>
        </group>
      )
  }
}

function Station({ info, index, total, onEnter }: { info: StationInfo; index: number; total: number; onEnter: (id: HubId) => void }) {
  const { x, z, rotY } = stationPose(index, total)
  const [hover, setHover] = useState(false)
  const lift = useRef<THREE.Group>(null)
  const color = info.unlocked ? info.hub.color : '#475569'
  useFrame((_, dt) => {
    if (!lift.current) return
    const target = hover ? 0.12 : 0
    lift.current.position.y += (target - lift.current.position.y) * Math.min(1, dt * 10)
  })
  return (
    <group
      position={[x, 0, z]}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onEnter(info.hub.id)
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
      {/* floor ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.25, 1.36, 48]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 0.9 : info.isNext ? 0.6 : 0.25} />
      </mesh>
      {/* desk */}
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.1, 1.1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.85, 0.556]}>
        <boxGeometry args={[1.9, 0.04, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={info.unlocked ? (hover ? 2.2 : 1.2) : 0.15} />
      </mesh>
      {[
        [-0.85, -0.45],
        [0.85, -0.45],
        [-0.85, 0.45],
        [0.85, 0.45],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.4, lz]} castShadow>
          <boxGeometry args={[0.07, 0.8, 0.07]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <group ref={lift} position={[0, 0, 0]}>
        <group position={[0, 0.9, 0]}>
          <StationProp id={info.hub.id} />
        </group>
      </group>
    </group>
  )
}

function LearningPath({ stations }: { stations: StationInfo[] }) {
  const { curve, litFraction } = useMemo(() => {
    const pts = stations.map((_, i) => {
      const { x, z } = stationPose(i, stations.length)
      return new THREE.Vector3(x * 0.78, 0.02, z * 0.78 + 0.6)
    })
    const lastUnlocked = stations.reduce((acc, s, i) => (s.unlocked ? i : acc), 0)
    return { curve: new THREE.CatmullRomCurve3(pts), litFraction: lastUnlocked / (stations.length - 1) }
  }, [stations])
  const dots = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const N = 40
  useFrame(({ clock }) => {
    const m = dots.current
    if (!m) return
    for (let i = 0; i < N; i++) {
      const u = ((i / N + clock.elapsedTime * 0.03) % 1) * Math.max(0.0001, litFraction)
      dummy.position.copy(curve.getPointAt(u))
      dummy.position.y = 0.05
      dummy.scale.setScalar(litFraction > 0 ? 1 : 0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 120, 0.03, 6, false]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, undefined, N]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color="#fbbf24" />
      </instancedMesh>
    </group>
  )
}

const LABEL_HEIGHT = 2.35

/**
 * Positions the station name tags (plain DOM elements owned by the page) over
 * their stations every frame. Plain DOM keeps them crisp, focusable buttons.
 */
function LabelProjector({ labels }: { labels: React.RefObject<(HTMLElement | null)[]> }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const els = labels.current
    if (!els) return
    els.forEach((el, i) => {
      if (!el) return
      const { x, z } = stationPose(i, els.length)
      v.set(x, LABEL_HEIGHT, z)
      const dist = camera.position.distanceTo(v)
      v.project(camera)
      const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2
      const px = ((v.x + 1) / 2) * size.width
      const py = ((1 - v.y) / 2) * size.height
      const scale = Math.min(1, Math.max(0.55, 9 / dist))
      el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%) scale(${scale})`
      el.style.visibility = visible ? 'visible' : 'hidden'
      el.style.zIndex = String(100 - Math.round(dist * 2))
    })
  })
  return null
}

/** Signals once the first scene contents have mounted (shaders compiled on the next frame). */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false)
  useFrame(() => {
    if (!fired.current) {
      fired.current = true
      onReady()
    }
  })
  return null
}

export function LabScene({
  stations,
  onEnter,
  onReady,
  labels,
}: {
  stations: StationInfo[]
  onEnter: (id: HubId) => void
  onReady?: () => void
  labels: React.RefObject<(HTMLElement | null)[]>
}) {
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [-1.3, 5.6, 10.2], fov: 45 }}>
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 14, 30]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 10, 6]} intensity={1.1} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <pointLight position={[0, 5, -2]} intensity={20} color="#38bdf8" distance={16} />
      <Suspense fallback={null}>
        <StudioEnvironment />
        <Grid position={[0, 0, 0]} args={[40, 40]} cellSize={0.5} cellThickness={0.5} cellColor="#16213a" sectionSize={2.5} sectionThickness={1} sectionColor="#1f2d4d" fadeDistance={28} fadeStrength={1.5} infiniteGrid />
        <LearningPath stations={stations} />
        {stations.map((s, i) => (
          <Station key={s.hub.id} info={s} index={i} total={stations.length} onEnter={onEnter} />
        ))}
        <ContactShadows position={[0, 0.005, 0]} opacity={0.4} scale={24} blur={2} far={4} />
        <LabelProjector labels={labels} />
        {onReady && <ReadySignal onReady={onReady} />}
      </Suspense>
      <OrbitControls
        target={[-1.3, 0.6, -0.6]}
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={0.5}
        maxPolarAngle={1.25}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
        makeDefault
      />
    </Canvas>
  )
}

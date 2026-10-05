import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { StudioEnvironment } from '../three/common'
import { LedModel } from '../three/models'
import type { WidgetProps } from './types'

type Leg = 'anode' | 'cathode'

function LegHitbox({ leg, onPick, state }: { leg: Leg; onPick: (l: Leg) => void; state: 'idle' | 'right' | 'wrong' }) {
  const [hover, setHover] = useState(false)
  const x = leg === 'anode' ? -0.25 : 0.25
  const len = leg === 'anode' ? 1.4 : 1.0
  const color = state === 'right' ? '#34d399' : state === 'wrong' ? '#f43f5e' : hover ? '#38bdf8' : '#38bdf8'
  return (
    <mesh
      position={[x, 0.1 - len / 2, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onPick(leg)
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
      <cylinderGeometry args={[0.11, 0.11, len, 12]} />
      <meshBasicMaterial color={color} transparent opacity={state !== 'idle' ? 0.45 : hover ? 0.35 : 0.08} depthWrite={false} />
    </mesh>
  )
}

export function LedLegs({ onEvent }: WidgetProps) {
  const [phase, setPhase] = useState<'plus' | 'minus' | 'done'>('plus')
  const [legState, setLegState] = useState<Record<Leg, 'idle' | 'right' | 'wrong'>>({ anode: 'idle', cathode: 'idle' })
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (phase === 'done') onEvent('found-both')
  }, [phase, onEvent])

  const pick = (leg: Leg) => {
    if (phase === 'done') return
    const want: Leg = phase === 'plus' ? 'anode' : 'cathode'
    if (leg === want) {
      setLegState((s) => ({ ...s, [leg]: 'right' }))
      setMsg(leg === 'anode' ? 'Yes! The longer leg is the + side (anode).' : 'Correct. The short leg, on the side with the flat edge, is − (cathode).')
      setPhase(phase === 'plus' ? 'minus' : 'done')
    } else {
      setLegState((s) => ({ ...s, [leg]: 'wrong' }))
      setMsg(phase === 'plus' ? 'Not that one. Compare the leg lengths.' : 'That’s the + leg you already found.')
      setTimeout(() => setLegState((s) => ({ ...s, [leg]: s[leg] === 'wrong' ? 'idle' : s[leg] })), 900)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
      <div className="relative h-[360px]">
        <Canvas dpr={[1, 2]} camera={{ position: [2.0, 0.5, 4.6], fov: 40 }}>
          <color attach="background" args={['#0b1120']} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 4]} intensity={1.3} />
          <StudioEnvironment />
          <group position={[0, 0.1, 0]}>
            <LedModel color="red" brightness={phase === 'done' ? 0.8 : 0} />
            <LegHitbox leg="anode" onPick={pick} state={legState.anode} />
            <LegHitbox leg="cathode" onPick={pick} state={legState.cathode} />
          </group>
          <ContactShadows position={[0, -1.3, 0]} opacity={0.45} scale={5} blur={2.4} />
          <OrbitControls enablePan={false} enableZoom={false} minDistance={2.5} maxDistance={6} target={[0, 0, 0]} makeDefault />
        </Canvas>
        <div className="absolute left-3 top-3 rounded-lg bg-ink-950/80 px-3 py-2 text-sm text-fog-100">
          {phase === 'plus' && 'Click the leg that goes to battery +'}
          {phase === 'minus' && 'Now click the leg that goes to battery −'}
          {phase === 'done' && '✅ Both legs found, so the LED lights!'}
        </div>
      </div>
      {msg && <div className="border-t border-ink-700 px-4 py-2.5 text-sm text-fog-300">{msg}</div>}
    </div>
  )
}

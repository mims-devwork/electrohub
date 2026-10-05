import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import * as THREE from 'three'
import { PartGlyph } from '../../circuit/PartGlyph'
import { Html, StudioEnvironment } from '../../three/common'
import { SectionTitle } from '../../ui/primitives'

// The circuit from Experiment 01, three ways: wires on a bench, a schematic, and a PCB.

type NetId = 'VBAT' | 'LED_A' | 'GND'

const NETS: Record<NetId, { color: string; plain: string; pcb: string }> = {
  VBAT: { color: '#ef4444', plain: 'Connects battery + to the resistor.', pcb: 'A top-layer copper trace from J1 pin 1 to R1.' },
  LED_A: { color: '#f59e0b', plain: 'Connects the resistor to the LED’s + leg.', pcb: 'A short top-layer trace between the R1 and D1 pads.' },
  GND: { color: '#38bdf8', plain: 'Connects the LED’s − leg back to battery −.', pcb: 'It drops through a via to the bottom layer, then runs back to J1 pin 2.' },
}

type Concept = 'net' | 'footprint' | 'pad' | 'trace' | 'via' | 'layer' | 'silkscreen'

const CONCEPTS: Record<Concept, { name: string; plain: string }> = {
  net: { name: 'Net', plain: 'Every point that’s electrically connected together. One net means one “wire”, even if it has many branches.' },
  footprint: { name: 'Footprint', plain: 'The pattern of copper pads and holes a part needs on the board, like a parking space shaped for that part.' },
  pad: { name: 'Pad', plain: 'An exposed copper spot where a component leg is soldered.' },
  trace: { name: 'Trace', plain: 'A flat copper “wire” printed on the board.' },
  via: { name: 'Via', plain: 'A tiny copper-plated hole that lets a trace jump between the top and bottom layers.' },
  layer: { name: 'Layers', plain: 'Boards have copper on the top and the bottom (sometimes more inside). Traces can cross over each other on different layers.' },
  silkscreen: { name: 'Silkscreen', plain: 'The printed white labels (J1, R1, D1) that tell you which part goes where.' },
}

// Board layout (x, z) — board top surface at y = 0.
const PADS: { id: string; net: NetId; x: number; z: number; part: 'J1' | 'R1' | 'D1' }[] = [
  { id: 'J1.1', net: 'VBAT', x: -2.4, z: -0.3, part: 'J1' },
  { id: 'J1.2', net: 'GND', x: -2.4, z: 0.3, part: 'J1' },
  { id: 'R1.1', net: 'VBAT', x: -1.1, z: -0.9, part: 'R1' },
  { id: 'R1.2', net: 'LED_A', x: 0.7, z: -0.9, part: 'R1' },
  { id: 'D1.A', net: 'LED_A', x: 1.8, z: -0.9, part: 'D1' },
  { id: 'D1.K', net: 'GND', x: 1.8, z: -0.4, part: 'D1' },
]
const TRACES: { net: NetId; layer: 'top' | 'bottom'; pts: [number, number][] }[] = [
  { net: 'VBAT', layer: 'top', pts: [[-2.4, -0.3], [-1.8, -0.9], [-1.1, -0.9]] },
  { net: 'LED_A', layer: 'top', pts: [[0.7, -0.9], [1.8, -0.9]] },
  { net: 'GND', layer: 'top', pts: [[1.8, -0.4], [1.8, 0.2]] },
  { net: 'GND', layer: 'bottom', pts: [[1.8, 0.2], [1.1, 0.9], [-1.8, 0.9], [-2.4, 0.3]] },
]
const VIA = { x: 1.8, z: 0.2 }
const T = 0.08 // half board thickness

function Trace({ pts, y, color, width = 0.12, onClick }: { pts: [number, number][]; y: number; color: string; width?: number; onClick: () => void }) {
  return (
    <group onClick={(e) => (e.stopPropagation(), onClick())}>
      {pts.slice(1).map(([bx, bz], i) => {
        const [ax, az] = pts[i]
        const len = Math.hypot(bx - ax, bz - az)
        const ang = Math.atan2(bz - az, bx - ax)
        return (
          <group key={i}>
            <mesh position={[(ax + bx) / 2, y, (az + bz) / 2]} rotation={[0, -ang, 0]}>
              <boxGeometry args={[len, 0.02, width]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={color === COPPER ? 0 : 0.6} />
            </mesh>
            <mesh position={[bx, y, bz]}>
              <cylinderGeometry args={[width / 2, width / 2, 0.02, 16]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={color === COPPER ? 0 : 0.6} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

const COPPER = '#c8923a'

function Pcb3D({ net, setNet, concept, showBottom }: { net: NetId | null; setNet: (n: NetId) => void; concept: Concept | null; showBottom: boolean }) {
  const netColor = (n: NetId) => (net === n || concept === 'net' ? NETS[n].color : COPPER)
  const glow = (on: boolean) => (on ? 1 : 0)
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 5.2, 5.6], fov: 42 }}>
      <color attach="background" args={['#0b1120']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 6, 4]} intensity={1.3} castShadow />
      <StudioEnvironment />
      {/* the board */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6, T * 2, 3]} />
        <meshStandardMaterial color="#14532d" roughness={0.5} transparent opacity={showBottom ? 0.35 : 1} depthWrite={!showBottom} />
      </mesh>
      {/* traces */}
      {TRACES.filter((t) => t.layer === 'top' || showBottom || concept === 'layer').map((t, i) => (
        <Trace
          key={i}
          pts={t.pts}
          y={t.layer === 'top' ? T + 0.011 : -T - 0.011}
          color={concept === 'trace' ? '#fde68a' : concept === 'layer' ? (t.layer === 'top' ? '#ef4444' : '#38bdf8') : netColor(t.net)}
          onClick={() => setNet(t.net)}
        />
      ))}
      {/* pads (through-hole: copper ring on both sides) */}
      {PADS.map((p) => {
        const hl = concept === 'pad' || concept === 'footprint'
        return (
          <group key={p.id} position={[p.x, 0, p.z]} onClick={(e) => (e.stopPropagation(), setNet(p.net))}>
            {[T + 0.012, -T - 0.012].map((y) => (
              <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.07, 0.17, 24]} />
                <meshStandardMaterial
                  color={hl ? '#fde68a' : net === p.net ? NETS[p.net].color : '#d9b25a'}
                  metalness={0.8}
                  roughness={0.25}
                  emissive={hl || net === p.net ? '#fbbf24' : '#000'}
                  emissiveIntensity={glow(hl || net === p.net) * 0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* via */}
      <group position={[VIA.x, 0, VIA.z]} onClick={(e) => (e.stopPropagation(), setNet('GND'))}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, T * 2 + 0.03, 16, 1, true]} />
          <meshStandardMaterial color={concept === 'via' ? '#fde68a' : '#d9b25a'} metalness={0.8} roughness={0.3} emissive="#fbbf24" emissiveIntensity={concept === 'via' ? 1 : 0} side={THREE.DoubleSide} />
        </mesh>
        {concept === 'via' && (
          <mesh>
            <sphereGeometry args={[0.35, 16, 12]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* footprint outlines */}
      {concept === 'footprint' &&
        [
          { x: -2.55, z: 0, w: 0.9, d: 1.3 },
          { x: -0.2, z: -0.9, w: 2.3, d: 0.6 },
          { x: 1.8, z: -0.65, w: 0.8, d: 0.8 },
        ].map((f, i) => (
          <mesh key={i} position={[f.x, T + 0.02, f.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[f.w, f.d]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.18} />
          </mesh>
        ))}
      {/* components */}
      {!(concept === 'pad' || concept === 'footprint' || concept === 'trace') && (
        <group>
          {/* J1 screw terminal */}
          <mesh position={[-2.55, T + 0.3, 0]} castShadow>
            <boxGeometry args={[0.55, 0.6, 1.1]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
          {[-0.3, 0.3].map((z) => (
            <mesh key={z} position={[-2.55, T + 0.61, z]}>
              <cylinderGeometry args={[0.13, 0.13, 0.04, 20]} />
              <meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.3} />
            </mesh>
          ))}
          {/* R1 */}
          <mesh position={[-0.2, T + 0.22, -0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 1.0, 20]} />
            <meshStandardMaterial color="#d8c39b" />
          </mesh>
          {[-0.45, -0.3, -0.15, 0.1].map((dx, i) => (
            <mesh key={i} position={[-0.2 + dx, T + 0.22, -0.9]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.145, 0.145, 0.06, 20]} />
              <meshStandardMaterial color={['#f5d02a', '#8a3cc9', '#7a4a1e', '#c9a227'][i]} />
            </mesh>
          ))}
          {[-1.1, 0.7].map((x) => (
            <mesh key={x} position={[x, T + 0.11, -0.9]}>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
              <meshStandardMaterial color="#c9ced6" metalness={0.9} />
            </mesh>
          ))}
          {/* D1 LED */}
          <mesh position={[1.8, T + 0.35, -0.65]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 0.5, 24]} />
            <meshStandardMaterial color="#ff3b3b" transparent opacity={0.85} emissive="#ff3b3b" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[1.8, T + 0.6, -0.65]}>
            <sphereGeometry args={[0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ff3b3b" transparent opacity={0.85} emissive="#ff3b3b" emissiveIntensity={0.6} />
          </mesh>
          <pointLight position={[1.8, 1.2, -0.65]} color="#ff3b3b" intensity={2} distance={3} />
        </group>
      )}
      {/* silkscreen */}
      {(concept === 'silkscreen' || concept === null || concept === 'net') &&
        [
          { t: 'J1', x: -2.55, z: 0.95 },
          { t: 'R1', x: -0.2, z: -1.35 },
          { t: 'D1', x: 2.45, z: -0.65 },
          { t: '+', x: -2.05, z: -0.3 },
        ].map((l) => (
          <Html key={l.t} position={[l.x, T + 0.02, l.z]} center zIndexRange={[10, 0]}>
            <div className={`pointer-events-none font-mono text-[11px] font-bold ${concept === 'silkscreen' ? 'text-volt' : 'text-white/85'}`}>{l.t}</div>
          </Html>
        ))}
      <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={9} blur={2.5} />
      <OrbitControls enablePan={false} enableZoom={false} makeDefault />
    </Canvas>
  )
}

function Schematic({ net, setNet }: { net: NetId | null; setNet: (n: NetId) => void }) {
  const wire = (n: NetId, d: string) => (
    <g onClick={() => setNet(n)} style={{ cursor: 'pointer' }}>
      <path d={d} stroke="transparent" strokeWidth="14" fill="none" />
      <path d={d} stroke={net === n ? NETS[n].color : '#a9b8d0'} strokeWidth={net === n ? 4 : 2.5} fill="none" strokeLinejoin="round" />
    </g>
  )
  return (
    <svg viewBox="0 0 320 200" className="w-full">
      {wire('VBAT', 'M 50 70 V 40 H 110')}
      {wire('LED_A', 'M 190 40 H 260 V 70')}
      {wire('GND', 'M 260 130 V 165 H 50 V 130')}
      {/* J1 connector */}
      <rect x="30" y="70" width="40" height="60" fill="none" stroke="#cdd7e6" strokeWidth="2" />
      <text x="50" y="104" textAnchor="middle" fill="#cdd7e6" fontSize="12" fontFamily="JetBrains Mono">
        J1
      </text>
      <text x="76" y="80" fill="#8a9bb8" fontSize="10">
        1 +
      </text>
      <text x="76" y="128" fill="#8a9bb8" fontSize="10">
        2 −
      </text>
      {/* R1 */}
      <path d="M 110 40 L 118 28 L 134 52 L 150 28 L 166 52 L 182 28 L 190 40" stroke="#cdd7e6" strokeWidth="2.5" fill="none" />
      <text x="150" y="20" textAnchor="middle" fill="#cdd7e6" fontSize="11" fontFamily="JetBrains Mono">
        R1 · 470 Ω
      </text>
      {/* D1 */}
      <path d="M 245 70 H 275 L 260 100 Z M 245 100 H 275 M 260 100 V 130" stroke="#cdd7e6" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <path d="M 280 78 l 10 -8 M 284 90 l 10 -8" stroke="#ff6b6b" strokeWidth="2" />
      <text x="292" y="104" fill="#cdd7e6" fontSize="11" fontFamily="JetBrains Mono">
        D1
      </text>
      {/* ground symbol */}
      <path d="M 150 165 V 178 M 138 178 H 162 M 143 184 H 157 M 148 190 H 152" stroke={net === 'GND' ? NETS.GND.color : '#a9b8d0'} strokeWidth="2" />
      {(['VBAT', 'LED_A', 'GND'] as NetId[]).map((n, i) => (
        <text key={n} x={[78, 205, 180][i]} y={[34, 34, 159][i]} fill={net === n ? NETS[n].color : '#5d6e8e'} fontSize="10" fontFamily="JetBrains Mono">
          {n}
        </text>
      ))}
    </svg>
  )
}

function Physical({ net, setNet }: { net: NetId | null; setNet: (n: NetId) => void }) {
  const wire = (n: NetId, d: string, base: string) => (
    <g onClick={() => setNet(n)} style={{ cursor: 'pointer' }}>
      <path d={d} stroke="transparent" strokeWidth="16" fill="none" />
      {net === n && <path d={d} stroke={NETS[n].color} strokeWidth="12" fill="none" opacity="0.35" />}
      <path d={d} stroke={base} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )
  return (
    <svg viewBox="0 0 320 200" className="w-full">
      <g transform="translate(60 100) rotate(270) scale(0.8)">
        <PartGlyph part={{ id: 'b', kind: 'battery', x: 0, y: 0, rot: 0, props: { voltage: 9 } }} />
      </g>
      <g transform="translate(160 40) scale(0.8)">
        <PartGlyph part={{ id: 'r', kind: 'resistor', x: 0, y: 0, rot: 0, props: { ohms: 470 } }} />
      </g>
      <g transform="translate(260 100) rotate(90) scale(0.8)">
        <PartGlyph part={{ id: 'l', kind: 'led', x: 0, y: 0, rot: 0, props: { color: 'red' } }} result={{ current: 0.014, voltage: 2, power: 0.03, brightness: 0.8, ledState: 'on' }} />
      </g>
      {wire('VBAT', 'M 60 55 Q 60 40 118 40', '#ef4444')}
      {wire('LED_A', 'M 202 40 Q 260 40 260 68', '#eab308')}
      {wire('GND', 'M 260 132 Q 260 175 160 175 Q 60 175 60 145', '#334155')}
    </svg>
  )
}

export function PcbPreview() {
  const [net, setNet] = useState<NetId | null>('GND')
  const [concept, setConcept] = useState<Concept | null>(null)
  const [showBottom, setShowBottom] = useState(true)
  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Preview · Levels 10–11" title="Physical circuit ↔ Schematic ↔ PCB">
        The same LED circuit from Experiment 01, shown three ways. Click any wire or net to see it in all three views. A PCB is just your wires, turned into copper printed on a board, so nothing can come loose.
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[300px_300px_minmax(0,1fr)]">
        <div className="panel p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">1 · Physical circuit</div>
          <Physical net={net} setNet={setNet} />
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">2 · Schematic</div>
          <Schematic net={net} setNet={setNet} />
        </div>
        <div className="space-y-3">
          <div className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">Selected net</div>
            <div className="mt-1 flex gap-1.5">
              {(Object.keys(NETS) as NetId[]).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setNet(n)
                    setConcept(null)
                  }}
                  className="rounded-md border px-2 py-1 font-mono text-xs"
                  style={{ borderColor: net === n ? NETS[n].color : 'var(--color-ink-600)', color: net === n ? NETS[n].color : 'var(--color-fog-300)' }}
                >
                  {n}
                </button>
              ))}
            </div>
            {net && (
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="text-fog-200">
                  <span className="text-fog-400">On the bench: </span>
                  {NETS[net].plain}
                </p>
                <p className="text-fog-200">
                  <span className="text-fog-400">On the PCB: </span>
                  {NETS[net].pcb}
                </p>
              </div>
            )}
          </div>
          <div className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fog-400">PCB words: click to highlight</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(CONCEPTS) as Concept[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setConcept((x) => (x === c ? null : c))}
                  className={`rounded-full border px-2.5 py-1 text-xs ${concept === c ? 'border-volt bg-volt/15 text-volt' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`}
                >
                  {CONCEPTS[c].name}
                </button>
              ))}
            </div>
            {concept && (
              <p className="rise-in mt-3 text-sm text-fog-200">
                <span className="font-semibold text-fog-100">{CONCEPTS[concept].name}: </span>
                {CONCEPTS[concept].plain}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="relative h-[460px] overflow-hidden rounded-2xl border border-ink-700">
            <Pcb3D net={net} setNet={setNet} concept={concept} showBottom={showBottom} />
            <div className="absolute left-3 top-3 text-[11px] font-semibold uppercase tracking-wider text-fog-400">3 · PCB (3D)</div>
            <label className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-ink-950/80 px-2 py-1 text-xs text-fog-300">
              <input type="checkbox" checked={showBottom} onChange={(e) => setShowBottom(e.target.checked)} className="accent-sky-400" />
              X-ray: see the bottom layer
            </label>
          </div>
          <p className="text-xs text-fog-400">Drag to rotate and look underneath. Click copper to select its net.</p>
        </div>
      </div>
    </div>
  )
}

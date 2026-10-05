import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, type ReactNode } from 'react'
import type { CatalogComponent } from '../content/types'
import { Html, StudioEnvironment } from './common'
import { MODEL_BY_ID } from './models'

/** A turntable for inspecting one component, with clickable hotspots. */
export function ComponentViewer({
  component,
  activeHotspot,
  onHotspot,
  children,
  height = 420,
}: {
  component?: CatalogComponent
  activeHotspot?: string | null
  onHotspot?: (id: string) => void
  children?: ReactNode
  height?: number | string
}) {
  const Model = component ? MODEL_BY_ID[component.id] : null
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-800 to-ink-950" style={{ height }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3.0, 1.9, 5.0], fov: 38 }}>
        <color attach="background" args={['#0b1120']} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={null}>
          <StudioEnvironment />
          <group position={[0, -0.2, 0]}>
            {Model && <Model />}
            {children}
            {component?.hotspots.map((h, i) => (
              <Html key={h.id} position={h.position} center zIndexRange={[20, 0]}>
                <button
                  onClick={() => onHotspot?.(h.id)}
                  className={`grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold shadow-lg transition-all ${
                    activeHotspot === h.id ? 'scale-110 border-volt bg-volt text-ink-950' : 'border-flow bg-ink-900/90 text-flow hover:scale-110'
                  }`}
                  aria-label={h.label}
                  title={h.label}
                >
                  {i + 1}
                </button>
              </Html>
            ))}
          </group>
          <ContactShadows position={[0, -1.25, 0]} opacity={0.5} scale={8} blur={2.4} far={3} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={9} target={[0, 0.35, 0]} autoRotate={!activeHotspot} autoRotateSpeed={0.8} makeDefault />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-ink-950/70 px-2 py-1 text-[11px] text-fog-400">Drag to rotate · scroll/pinch to zoom · click the numbers</div>
    </div>
  )
}

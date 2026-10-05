import { Environment, Html as DreiHtml, Lightformer } from '@react-three/drei'
import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import * as THREE from 'three'

export type Vec3 = [number, number, number]

const UP = new THREE.Vector3(0, 1, 0)

/** A straight cylinder between two points: leads, pins, wires. */
export function Rod({ from, to, radius = 0.03, color = '#c8ccd2', metal = true }: { from: Vec3; to: Vec3; radius?: number; color?: string; metal?: boolean }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const length = dir.length()
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
    return { position: a.add(b).multiplyScalar(0.5), quaternion: q, length }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} metalness={metal ? 0.85 : 0.1} roughness={metal ? 0.3 : 0.6} />
    </mesh>
  )
}

/** A polyline of rods (bent component legs). */
export function Lead({ points, radius = 0.03, color }: { points: Vec3[]; radius?: number; color?: string }) {
  return (
    <group>
      {points.slice(1).map((p, i) => (
        <group key={i}>
          <Rod from={points[i]} to={p} radius={radius} color={color} />
          {i > 0 && (
            <mesh position={points[i]}>
              <sphereGeometry args={[radius, 8, 8]} />
              <meshStandardMaterial color={color ?? '#c8ccd2'} metalness={0.85} roughness={0.3} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Canvas-drawn text texture (no font downloads needed). */
export function useLabelTexture(text: string, opts: { bg?: string; fg?: string; width?: number; height?: number; font?: string } = {}) {
  const { bg = '#111', fg = '#ddd', width = 256, height = 128, font = '600 44px Inter, system-ui, sans-serif' } = opts
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = fg
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    text.split('\n').forEach((line, i, all) => {
      ctx.fillText(line, width / 2, height / 2 + (i - (all.length - 1) / 2) * (height / (all.length + 0.6)))
    })
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [text, bg, fg, width, height, font])
}

/** Soft studio reflections made from local light panels — no HDR download. */
export function StudioEnvironment() {
  return (
    <Environment resolution={128}>
      <Lightformer intensity={2.2} position={[0, 5, -6]} scale={[12, 4, 1]} color="#dbeafe" />
      <Lightformer intensity={1.4} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#fde68a" />
      <Lightformer intensity={1.2} position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#a5f3fc" />
      <Lightformer intensity={0.8} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#1e293b" />
    </Environment>
  )
}

export const METAL = { color: '#c9ced6', metalness: 0.9, roughness: 0.28 }
export const COPPER = { color: '#d08b4a', metalness: 0.85, roughness: 0.35 }

/**
 * drei's <Html>, mounted one tick after the scene. Mounting it in the very
 * first commit (before the canvas is attached) makes drei recreate its portal
 * root, and the old root's deferred unmount then wipes the new content.
 */
export function Html(props: ComponentProps<typeof DreiHtml>) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [])
  return ready ? <DreiHtml {...props} /> : null
}

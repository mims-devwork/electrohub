// A top-down simulation of a two-wheeled robot with one ultrasonic distance
// sensor. Units are centimetres, seconds and radians (0 = facing +x).
// The program decides what the wheels *should* do; the wheels take a moment to
// get there, which is what makes stopping distance (and crashing) real.

export type ArenaId = 'room' | 'hall'

export interface Arena {
  id: ArenaId
  name: string
  w: number
  h: number
  pillars: { x: number; y: number; r: number }[]
  start: { x: number; y: number; heading: number }
}

export const ARENAS: Record<ArenaId, Arena> = {
  room: {
    id: 'room',
    name: 'Small room',
    w: 200,
    h: 160,
    pillars: [
      { x: 132, y: 62, r: 14 },
      { x: 62, y: 112, r: 12 },
    ],
    start: { x: 40, y: 40, heading: 0.5 },
  },
  hall: {
    id: 'hall',
    name: 'Big hall',
    // Big enough that from the middle every wall is beyond the sensor's 4 m range.
    w: 1000,
    h: 900,
    pillars: [
      { x: 880, y: 150, r: 34 },
      { x: 140, y: 770, r: 30 },
    ],
    start: { x: 500, y: 450, heading: 0.3 },
  },
}

export const ROBOT = {
  /** Body radius (cm). */
  radius: 9,
  /** Distance between the wheels (cm). */
  wheelBase: 14,
  /** Wheel speed at full power (cm/s): 3 turns a second of a 20 cm wheel. */
  topSpeed: 60,
  /** Wheel speed when spinning on the spot (cm/s). */
  turnSpeed: 22,
  /** How quickly the wheels catch up with what the motors are told (s). */
  lag: 0.25,
  /** The sensor hears echoes up to this far (cm); beyond that it reports 0. */
  sensorRange: 400,
  /** The sound beam spreads: we check straight ahead and this far either side (rad, about 17°). */
  beam: 0.3,
}

export interface RobotState {
  x: number
  y: number
  heading: number
  /** Actual wheel speeds (cm/s). */
  left: number
  right: number
  /** Touching a wall or pillar right now. */
  touching: boolean
  crashes: number
  /** Forward distance driven since the last crash (cm). */
  odometer: number
  /** Seconds spent turning on the spot without moving forward. */
  spinning: number
  /** Last distance reading (cm, 0 = no echo). */
  reading: number
}

export function startState(arena: Arena): RobotState {
  return { ...arena.start, left: 0, right: 0, touching: false, crashes: 0, odometer: 0, spinning: 0, reading: 0 }
}

/** Distance from (x, y) along `dir` to the first wall or pillar (cm). */
export function castRay(arena: Arena, x: number, y: number, dir: number): number {
  const fx = Math.cos(dir)
  const fy = Math.sin(dir)
  let best = Infinity
  const walls = [fx > 1e-9 ? (arena.w - x) / fx : Infinity, fx < -1e-9 ? -x / fx : Infinity, fy > 1e-9 ? (arena.h - y) / fy : Infinity, fy < -1e-9 ? -y / fy : Infinity]
  for (const t of walls) if (t >= 0 && t < best) best = t
  for (const p of arena.pillars) {
    const ox = x - p.x
    const oy = y - p.y
    const b = ox * fx + oy * fy
    const c = ox * ox + oy * oy - p.r * p.r
    const disc = b * b - c
    if (disc >= 0) {
      const t = -b - Math.sqrt(disc)
      if (t >= 0 && t < best) best = t
    }
  }
  return best
}

/** What the ultrasonic sensor reports: the nearest echo in its beam, or 0 if nothing comes back. */
export function readSensor(arena: Arena, s: RobotState): number {
  // The sound cone starts as wide as the robot's front and spreads out from there.
  const fx = Math.cos(s.heading)
  const fy = Math.sin(s.heading)
  let d = Infinity
  for (const side of [-0.8, 0, 0.8]) {
    const ox = s.x + fx * ROBOT.radius - fy * side * ROBOT.radius
    const oy = s.y + fy * ROBOT.radius + fx * side * ROBOT.radius
    for (const a of [-ROBOT.beam, 0, ROBOT.beam]) d = Math.min(d, castRay(arena, ox, oy, s.heading + a))
  }
  return d > ROBOT.sensorRange ? 0 : Math.round(d)
}

/** A small step (cm) pointing away from every wall and pillar the robot is touching. */
function pushAway(arena: Arena, x: number, y: number) {
  const r = ROBOT.radius + 0.5
  let px = 0
  let py = 0
  if (x < r) px += 1
  if (x > arena.w - r) px -= 1
  if (y < r) py += 1
  if (y > arena.h - r) py -= 1
  for (const p of arena.pillars) {
    const dx = x - p.x
    const dy = y - p.y
    const d = Math.hypot(dx, dy)
    if (d < p.r + r) {
      px += dx / d
      py += dy / d
    }
  }
  const len = Math.hypot(px, py) || 1
  return { x: (px / len) * 1.5, y: (py / len) * 1.5 }
}

function collides(arena: Arena, x: number, y: number) {
  const r = ROBOT.radius
  if (x < r || y < r || x > arena.w - r || y > arena.h - r) return true
  return arena.pillars.some((p) => Math.hypot(x - p.x, y - p.y) < p.r + r)
}

/** Move the robot on by `dt` seconds, with the motors asking for these wheel speeds (cm/s). */
export function stepRobot(arena: Arena, s: RobotState, want: { left: number; right: number }, dt: number): RobotState {
  const ease = 1 - Math.exp(-dt / ROBOT.lag)
  let left = s.left + (want.left - s.left) * ease
  let right = s.right + (want.right - s.right) * ease
  const v = (left + right) / 2
  const w = (right - left) / ROBOT.wheelBase
  const heading = s.heading + w * dt
  const nx = s.x + Math.cos(heading) * v * dt
  const ny = s.y + Math.sin(heading) * v * dt
  let { x, y, crashes, odometer } = s
  let touching = false
  if (collides(arena, nx, ny)) {
    // Bump: it loses its speed, but scrapes along whatever it hit rather than sticking to it.
    touching = true
    if (!s.touching) {
      crashes++
      odometer = 0
    }
    if (!collides(arena, nx, y)) x = nx
    else if (!collides(arena, x, ny)) y = ny
    else {
      // Wedged: bounce back a touch, away from whatever it's pressed against.
      const away = pushAway(arena, x, y)
      if (!collides(arena, x + away.x, y + away.y)) {
        x += away.x
        y += away.y
      }
    }
    const turn = (right - left) / 2
    left = left * 0.5 - turn * 0.5
    right = right * 0.5 + turn * 0.5
  } else {
    x = nx
    y = ny
    odometer += Math.max(0, v) * dt
  }
  const spinning = Math.abs(v) < 2 && Math.abs(w) > 0.5 ? s.spinning + dt : 0
  return { x, y, heading, left, right, touching, crashes, odometer, spinning, reading: s.reading }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Issue } from '../sim/diagnose'
import { AVOID, defaultAvoidSlots, runAvoid, type AvoidSlots } from './program'
import { ARENAS, ROBOT, readSensor, startState, stepRobot, type ArenaId, type RobotState } from './sim'
import type { RobotSetup } from './types'

const TICK_MS = 60
const SUBSTEPS = 3
const UPLOAD_MS = 900
const SCOPE_SAMPLES = 90
const TRAIL = 140

export interface RobotTick {
  state: RobotState
  turning: boolean
  active: string[]
}

/** Run the obstacle-avoiding program on the simulated robot. Pure, so tests can drive it too. */
export function tickRobot(arenaId: ArenaId, state: RobotState, slots: AvoidSlots, running: boolean, dt = TICK_MS / 1000): RobotTick {
  const arena = ARENAS[arenaId]
  const reading = readSensor(arena, state)
  const run = running ? runAvoid(reading, slots) : { turning: false, want: { left: 0, right: 0 }, active: [] }
  let next = { ...state, reading }
  for (let i = 0; i < SUBSTEPS; i++) next = stepRobot(arena, next, run.want, dt / SUBSTEPS)
  return { state: { ...next, reading }, turning: run.turning, active: run.active }
}

export function diagnoseRobot(t: RobotTick, slots: AvoidSlots, sinceCrash: number): Issue[] {
  const issues: Issue[] = []
  const limit = Number(slots.cond.match(/(\d+)$/)?.[1] ?? 0)
  if (sinceCrash < 3) {
    issues.push({
      id: 'crash',
      severity: 'warning',
      highlight: [],
      title: 'Bump! It hit something',
      what: `The robot only starts turning once something is closer than ${limit} cm, but at ${slots.speed === '255' ? 'full' : 'this'} speed it travels several centimetres before it has slowed and turned.`,
      why: 'Two things eat up the gap: the time between readings, and the wheels’ momentum, which keeps the robot rolling forward for a moment after the motors change. That’s its stopping distance.',
      fix: 'Start turning earlier (a bigger distance), or drive slower so there’s less to stop.',
    })
  }
  if (t.state.spinning > 4) {
    issues.push({
      id: 'spinning',
      severity: 'info',
      highlight: [],
      title: 'It’s spinning on the spot',
      what: `The sensor keeps reporting ${t.state.reading} cm${t.state.reading === 0 ? ', even though nothing is close' : ''}, so the program keeps deciding to turn.`,
      why: t.state.reading === 0 ? `An ultrasonic sensor reports 0 when no echo comes back, which happens when the nearest wall is more than ${ROBOT.sensorRange / 100} m away. To the code, 0 looks like “something right in front”.` : 'Whatever it can see is always closer than its turning distance.',
      fix: t.state.reading === 0 ? 'Make the code ignore readings of 0: only turn when the distance is more than 0 and less than your limit.' : 'Try a smaller turning distance.',
    })
  }
  if (t.state.odometer > 100 && sinceCrash >= 3) {
    issues.push({
      id: 'clean',
      severity: 'success',
      highlight: [],
      title: 'Driving cleanly',
      what: `${(t.state.odometer / 100).toFixed(1)} m since the last bump.`,
      why: 'Sense → decide → act, many times a second, with enough room left to stop.',
    })
  }
  return issues
}

export function useRobot(setup: RobotSetup) {
  const [arenaId, setArenaId] = useState<ArenaId>(setup.arena)
  const [slots, setSlots] = useState<AvoidSlots>(() => defaultAvoidSlots(setup.slots))
  const [running, setRunning] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploads, setUploads] = useState(0)
  const [tick, setTick] = useState<RobotTick>(() => ({ state: startState(ARENAS[setup.arena]), turning: false, active: [] }))
  const [scope, setScope] = useState<number[]>(() => Array(SCOPE_SAMPLES).fill(0))
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([])
  const lastCrashAt = useRef(-Infinity)
  const clock = useRef(0)

  const live = useRef({ arenaId, slots, running, uploading, tick })
  live.current = { arenaId, slots, running, uploading, tick }

  useEffect(() => {
    const t = setInterval(() => {
      const s = live.current
      const next = tickRobot(s.arenaId, s.tick.state, s.slots, s.running && !s.uploading)
      clock.current += TICK_MS / 1000
      if (next.state.crashes > s.tick.state.crashes) lastCrashAt.current = clock.current
      live.current.tick = next
      setTick(next)
      setScope((h) => [...h.slice(1), next.state.reading])
      setTrail((tr) => (Math.hypot((tr.at(-1)?.x ?? -99) - next.state.x, (tr.at(-1)?.y ?? -99) - next.state.y) > 2 ? [...tr.slice(-TRAIL), { x: next.state.x, y: next.state.y }] : tr))
    }, TICK_MS)
    return () => clearInterval(t)
  }, [])

  // New code: the robot stops while it uploads, and old bumps and distances no longer count.
  useEffect(() => {
    if (!uploading) return
    const t = setTimeout(() => {
      setUploading(false)
      setUploads((n) => n + 1)
      const fresh = { ...live.current.tick.state, crashes: 0, odometer: 0 }
      live.current.tick = { ...live.current.tick, state: fresh }
      setTick((tk) => ({ ...tk, state: fresh }))
      lastCrashAt.current = -Infinity
    }, UPLOAD_MS)
    return () => clearTimeout(t)
  }, [uploading, slots])

  const putBack = (id: ArenaId = arenaId) => {
    const fresh = { state: startState(ARENAS[id]), turning: false, active: [] }
    live.current.tick = fresh
    setTick(fresh)
    setTrail([])
    lastCrashAt.current = -Infinity
  }

  const setSlot = (id: string, value: string) => {
    if (slots[id as keyof AvoidSlots] === value) return
    setSlots((s) => ({ ...s, [id]: value }))
    setUploading(true)
  }

  const chooseArena = (id: ArenaId) => {
    setArenaId(id)
    live.current.arenaId = id
    putBack(id)
  }

  const reset = () => {
    setSlots(defaultAvoidSlots(setup.slots))
    setRunning(false)
    setUploading(false)
    setArenaId(setup.arena)
    live.current.arenaId = setup.arena
    putBack(setup.arena)
  }

  const sinceCrash = clock.current - lastCrashAt.current
  const issues = useMemo(() => diagnoseRobot(tick, slots, sinceCrash), [tick, slots, sinceCrash])

  return {
    program: AVOID,
    arena: ARENAS[arenaId],
    slots,
    running,
    uploading,
    uploads,
    tick,
    scope,
    trail,
    issues,
    setRunning,
    setSlot,
    chooseArena,
    putBack: () => putBack(),
    reset,
  }
}

export type RobotApi = ReturnType<typeof useRobot>

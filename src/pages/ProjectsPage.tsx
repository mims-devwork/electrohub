import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CAPSTONE, HUB_BY_ID, LEVEL_BY_N } from '../content'
import { highestUnlocked } from '../lib/progression'
import { PageHeader, useSnapshot } from '../ui/Layout'
import { LinkButton, Pill } from '../ui/primitives'

const BLOCKS = [
  { id: 'battery', icon: '🔋', name: 'Battery', job: 'Stores the energy for everything. Robots usually use a rechargeable lithium pack (e.g. 7.4 V).', level: 8 },
  { id: 'power', icon: '⚡', name: 'Power system', job: 'A fuse for protection, plus a regulator that turns battery voltage into a steady 5 V or 3.3 V for the brain.', level: 8 },
  { id: 'mcu', icon: '🧠', name: 'Microcontroller', job: 'Reads the sensors, runs your code and decides what the motors should do.', level: 5 },
  { id: 'sensors', icon: '📡', name: 'Sensors', job: 'The robot’s senses: distance, light, wheel encoders. They turn the world into voltages.', level: 6 },
  { id: 'driver', icon: '🔀', name: 'Motor driver', job: 'MOSFET switches that let the microcontroller’s weak signal control big motor currents.', level: 7 },
  { id: 'motors', icon: '⚙️', name: 'Motors', job: 'Turn electrical energy into movement through gears and wheels.', level: 7 },
]

export function ProjectsPage() {
  const snap = useSnapshot()
  const unlocked = highestUnlocked(snap)
  const [block, setBlock] = useState(BLOCKS[2])
  const hub = HUB_BY_ID.projects

  return (
    <div className="pb-16">
      <PageHeader
        crumbs={[{ label: 'Project Bay' }]}
        title="Capstone: Build Your Own Robot"
        learning="Everything in the course leads here. You’ll design the complete electronics for a small robot, from first idea to a 3D circuit board inside a working machine."
        icon={hub.icon}
        accent={hub.color}
      />
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 pt-6">
        <section>
          <h2 className="text-lg font-semibold text-fog-100">The block diagram you’ll design</h2>
          <p className="text-sm text-fog-400">Click a block to see what it does and where you’ll learn it.</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="panel flex flex-col items-center gap-1 p-5">
              {[[BLOCKS[0]], [BLOCKS[1]], [BLOCKS[2]], [BLOCKS[3], BLOCKS[4]], [BLOCKS[5]]].map((row, i) => (
                <div key={i} className="flex flex-col items-center">
                  {i > 0 && (
                    <div className="py-0.5 text-fog-400" aria-hidden>
                      ↓
                    </div>
                  )}
                  <div className="flex gap-3">
                    {row.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBlock(b)}
                        className={`min-w-[150px] rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${block.id === b.id ? 'border-volt bg-volt/10 text-fog-100' : 'border-ink-600 bg-ink-900 text-fog-200 hover:border-fog-400'}`}
                      >
                        <span aria-hidden>{b.icon}</span> {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="panel p-5">
              <div className="text-3xl" aria-hidden>
                {block.icon}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-fog-100">{block.name}</h3>
              <p className="mt-1 text-sm text-fog-200">{block.job}</p>
              <p className="mt-3 text-xs text-fog-400">
                You’ll learn this in <span className="text-fog-200">Level {block.level}: {LEVEL_BY_N[block.level].title}</span>.
              </p>
              <Link to="/hub/robotics" className="mt-3 inline-block text-sm text-flow hover:underline">
                See it running in the Robotics Lab →
              </Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-fog-100">Seven milestones</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {CAPSTONE.map((s) => {
              const ready = s.learnedIn.every((n) => n <= unlocked)
              return (
                <li key={s.n} className={`panel p-4 ${ready ? '' : 'opacity-80'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-fog-400">MILESTONE {s.n}</span>
                    {ready ? <Pill color="var(--color-ok)">Skills ready</Pill> : <Pill>🔒 Needs L{Math.max(...s.learnedIn)}</Pill>}
                  </div>
                  <div className="mt-1 font-semibold text-fog-100">{s.title}</div>
                  <div className="text-sm italic text-fog-300">“{s.question}”</div>
                  <p className="mt-2 text-sm text-fog-400">{s.description}</p>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="panel flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-fog-100">Where you are now</div>
            <p className="text-sm text-fog-300">
              You’re on Level {unlocked}. The circuits you build in the Circuit Lab, like the LED and resistor, become one small corner of this robot’s board.
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton to="/hub/pcb">See your LED circuit as a PCB</LinkButton>
            <LinkButton to="/map" variant="primary">
              Learning map
            </LinkButton>
          </div>
        </section>
      </div>
    </div>
  )
}

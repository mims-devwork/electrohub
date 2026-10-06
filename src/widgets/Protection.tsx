import { useEffect, useState } from 'react'
import type { WidgetProps } from './types'

type Disaster = 'reverse' | 'short'
type Outcome = { tone: 'bad' | 'good'; title: string; body: string }

function outcome(d: Disaster, fuse: boolean, diode: boolean): Outcome {
  if (d === 'reverse') {
    return diode
      ? { tone: 'good', title: 'Nothing happens, and that’s the point', body: 'The diode is a one-way door. Backwards, no current gets through, so the electronics never see the wrong voltage. Turn the battery round and everything works.' }
      : { tone: 'bad', title: '💥 The chips are dead', body: 'Backwards voltage pours through the protection diodes inside every chip. The microcontroller and the driver are destroyed in a fraction of a second.' }
  }
  return fuse
    ? { tone: 'good', title: 'The fuse blew, and that’s all', body: 'The huge current melted the fuse wire in a moment, cutting the circuit before the wires or battery could overheat. Fix the short and fit a new fuse.' }
    : { tone: 'bad', title: '🔥 The wires are glowing', body: 'With nothing to stop it, the battery pushes tens of amps through the short. Insulation melts and a lithium battery can catch fire.' }
}

function Toggle({ label, on, set, icon }: { label: string; on: boolean; set: (v: boolean) => void; icon: string }) {
  return (
    <button onClick={() => set(!on)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? 'border-ok bg-ok/15 text-ok' : 'border-ink-600 text-fog-300 hover:text-fog-100'}`} aria-pressed={on}>
      <span aria-hidden>{icon}</span>
      {on ? `${label} fitted` : `Fit a ${label.toLowerCase()}`}
    </button>
  )
}

export function Protection({ onEvent }: WidgetProps) {
  const [fuse, setFuse] = useState(false)
  const [diode, setDiode] = useState(false)
  const [last, setLast] = useState<{ d: Disaster; o: Outcome } | null>(null)
  const [safe, setSafe] = useState({ reverse: false, short: false })

  useEffect(() => {
    if (safe.reverse && safe.short) onEvent('protected')
  }, [safe, onEvent])

  const trigger = (d: Disaster) => {
    const o = outcome(d, fuse, diode)
    setLast({ d, o })
    if (o.tone === 'good') setSafe((s) => ({ ...s, [d]: true }))
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <svg viewBox="0 0 600 120" className="w-full">
        <rect x="10" y="30" width="90" height="60" rx="6" fill="#111827" stroke="#374151" strokeWidth="2" />
        <text x="55" y="66" textAnchor="middle" fontSize="13" fill="#fbbf24" fontWeight="700">
          🔋 7.4 V
        </text>
        <line x1="100" x2={fuse ? 180 : 250} y1="45" y2="45" stroke="#ef4444" strokeWidth="4" />
        {fuse && (
          <g>
            <rect x="180" y="35" width="70" height="20" rx="4" fill="#e5e7eb" opacity="0.9" />
            <line x1="184" x2="246" y1="45" y2="45" stroke={last?.d === 'short' && last.o.tone === 'good' ? 'transparent' : '#92400e'} strokeWidth="2" />
            <text x="215" y="28" textAnchor="middle" fontSize="10" fill="#a9b8d0">
              fuse
            </text>
          </g>
        )}
        <line x1="250" x2={diode ? 320 : 400} y1="45" y2="45" stroke="#ef4444" strokeWidth="4" />
        {diode && (
          <g>
            <path d="M 320 33 L 320 57 L 350 45 Z" fill="#e5e7eb" />
            <line x1="352" x2="352" y1="33" y2="57" stroke="#e5e7eb" strokeWidth="4" />
            <line x1="352" x2="400" y1="45" y2="45" stroke="#ef4444" strokeWidth="4" />
            <text x="336" y="28" textAnchor="middle" fontSize="10" fill="#a9b8d0">
              diode
            </text>
          </g>
        )}
        <line x1="100" x2="400" y1="78" y2="78" stroke="#334155" strokeWidth="4" />
        <rect x="400" y="22" width="180" height="76" rx="8" fill={last?.o.tone === 'bad' ? '#3f1d2b' : '#0e6e8c'} stroke="#0b5468" strokeWidth="2" />
        <text x="490" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill="#e0f2fe">
          robot electronics
        </text>
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Toggle label="Fuse" on={fuse} set={setFuse} icon="🧯" />
        <Toggle label="Diode" on={diode} set={setDiode} icon="➡️" />
        <span className="mx-1 h-6 w-px bg-ink-600" />
        <button onClick={() => trigger('reverse')} className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-rose-200 hover:bg-danger/20">
          Plug the battery in backwards
        </button>
        <button onClick={() => trigger('short')} className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-rose-200 hover:bg-danger/20">
          Short the wires
        </button>
      </div>
      {last && (
        <div key={`${last.d}-${fuse}-${diode}-${last.o.title}`} className={`rise-in mt-3 rounded-xl border p-3 text-sm ${last.o.tone === 'good' ? 'border-ok/50 bg-ok/10' : 'shake border-danger/50 bg-danger/10'}`}>
          <div className={`font-semibold ${last.o.tone === 'good' ? 'text-ok' : 'text-rose-200'}`}>{last.o.title}</div>
          <p className="mt-1 text-fog-200">{last.o.body}</p>
        </div>
      )}
      <div className="mt-3 flex gap-2 text-xs">
        <span className={`rounded-md border px-2 py-1 ${safe.reverse ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{safe.reverse ? '✓' : '○'} Survive a backwards battery</span>
        <span className={`rounded-md border px-2 py-1 ${safe.short ? 'border-ok/50 text-ok' : 'border-ink-600 text-fog-400'}`}>{safe.short ? '✓' : '○'} Survive a short</span>
      </div>
    </div>
  )
}

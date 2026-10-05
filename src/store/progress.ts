import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface ProgressState {
  xp: number
  /** Keys like "lesson:voltage" or "experiment:light-an-led". */
  completed: string[]
  /** Component catalog ids the learner has inspected in 3D. */
  inspected: string[]
  complete: (key: string, xp: number) => void
  inspect: (componentId: string) => void
  reset: () => void
}

const safeStorage = createJSONStorage(() => {
  try {
    const probe = '__electrohub_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    const mem = new Map<string, string>()
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    }
  }
})

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      completed: [],
      inspected: [],
      complete: (key, xp) => {
        if (get().completed.includes(key)) return
        set((s) => ({ completed: [...s.completed, key], xp: s.xp + xp }))
      },
      inspect: (id) => {
        if (get().inspected.includes(id)) return
        set((s) => ({ inspected: [...s.inspected, id], xp: s.xp + 10 }))
      },
      reset: () => set({ xp: 0, completed: [], inspected: [] }),
    }),
    {
      name: 'electrohub-progress-v1',
      storage: safeStorage,
      partialize: (s) => ({ xp: s.xp, completed: s.completed, inspected: s.inspected }),
    },
  ),
)

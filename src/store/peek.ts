import { create } from 'zustand'

/** Levels the learner chose to "peek" at before unlocking them (this session only). */
export const usePeek = create<{ levels: number[]; peek: (n: number) => void }>()((set) => ({
  levels: [],
  peek: (n) => set((s) => (s.levels.includes(n) ? s : { levels: [...s.levels, n] })),
}))

export function usePeeking(levelN: number) {
  const peeking = usePeek((s) => s.levels.includes(levelN))
  const peek = usePeek((s) => s.peek)
  return [peeking, () => peek(levelN)] as const
}

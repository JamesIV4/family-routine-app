import { beforeEach, describe, expect, it, vi } from 'vitest'
import confetti from 'canvas-confetti'
import { celebrateSchoolPrep, stopCelebration } from './celebration'

vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }))

beforeEach(() => {
  stopCelebration()
  vi.clearAllMocks()
  vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: false })) })
})

describe('School Prep confetti', () => {
  it('uses the five Realistic Look bursts with 200 particles in total', () => {
    celebrateSchoolPrep()
    const bursts = vi.mocked(confetti).mock.calls.map(([options]) => options!)
    expect(bursts).toEqual([
      expect.objectContaining({ particleCount: 50, spread: 26, startVelocity: 55 }),
      expect.objectContaining({ particleCount: 40, spread: 60 }),
      expect.objectContaining({ particleCount: 70, spread: 100, decay: 0.91, scalar: 0.8 }),
      expect.objectContaining({ particleCount: 20, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 }),
      expect.objectContaining({ particleCount: 20, spread: 120, startVelocity: 45 }),
    ])
    for (const burst of bursts) {
      expect(burst.origin).toEqual({ y: 0.7 })
      expect(burst.disableForReducedMotion).toBe(true)
    }
  })

  it('skips canvas animation when reduced motion is requested', () => {
    vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: true })) })
    celebrateSchoolPrep()
    expect(confetti).not.toHaveBeenCalled()
  })

  it('can stop active confetti when leaving the page or undoing a task', () => {
    celebrateSchoolPrep()
    stopCelebration()
    expect(confetti.reset).toHaveBeenCalledOnce()
  })

  it('does not initialize confetti when cleaning up a page that never celebrated', () => {
    stopCelebration()
    expect(confetti.reset).not.toHaveBeenCalled()
  })
})

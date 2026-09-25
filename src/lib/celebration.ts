import confetti, { type Options } from 'canvas-confetti'

let celebrationStarted = false

// The "Realistic Look" recipe: https://www.kirilv.com/canvas-confetti/
export function celebrateSchoolPrep() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  celebrationStarted = true

  function fire(particleRatio: number, options: Options) {
    void confetti({
      origin: { y: 0.7 },
      ...options,
      particleCount: Math.floor(200 * particleRatio),
      disableForReducedMotion: true,
      zIndex: 40,
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

export function stopCelebration() {
  // Avoid initializing a canvas/worker just to clean up an unplayed effect.
  if (celebrationStarted) {
    confetti.reset()
    celebrationStarted = false
  }
}

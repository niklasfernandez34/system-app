let ctx: AudioContext | undefined

export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    ctx = undefined
  }
}

export function beep() {
  navigator.vibrate?.([200, 100, 200])
  if (!ctx) return
  const t = ctx.currentTime
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, t + i * 0.25)
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t + i * 0.25)
    osc.stop(t + i * 0.25 + 0.2)
  }
}

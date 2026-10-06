import { host } from '../app/host'
import { useUI } from '../app/store'
import type { SimEvent } from '../sim/types'
import { RateLimiter } from './limiter'

export type Sound = 'enter' | 'order' | 'cook' | 'ready' | 'place' | 'star'

const SOUNDS: Sound[] = ['enter', 'order', 'cook', 'ready', 'place', 'star']

export function soundFor(e: SimEvent): Sound | null {
  switch (e.type) {
    case 'customerEnter':
      return 'enter'
    case 'orderTaken':
      return 'order'
    case 'cookStart':
      return e.station === 'grill' || e.station === 'fryer' ? 'cook' : null
    case 'orderReady':
      return 'ready'
    case 'purchase':
      return 'place'
    case 'starGained':
      return 'star'
    default:
      return null
  }
}

const GAIN: Record<Sound, number> = {
  enter: 0.4,
  order: 0.5,
  cook: 0.35,
  ready: 0.6,
  place: 0.7,
  star: 0.9,
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
const buffers = new Map<Sound, AudioBuffer>()
const limiter = new RateLimiter({
  enter: 600,
  order: 300,
  cook: 400,
  ready: 300,
  place: 100,
  star: 0,
})

async function load() {
  const c = ctx
  if (!c) return
  const base = import.meta.env.BASE_URL
  await Promise.all(
    SOUNDS.map(async (s) => {
      try {
        const res = await fetch(`${base}assets/sfx/${s}.ogg`)
        buffers.set(s, await c.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // Missing or undecodable sound: play nothing for it.
      }
    }),
  )
}

function play(s: Sound) {
  if (!ctx || !master) return
  const buf = buffers.get(s)
  if (!buf || !limiter.allow(s, performance.now())) return
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  g.gain.value = GAIN[s]
  src.buffer = buf
  src.connect(g).connect(master)
  src.start()
}

/** Audio starts on the first user interaction (browser autoplay policy). */
export function initAudio() {
  const unlock = () => {
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = useUI.getState().settings.volume
      master.connect(ctx.destination)
      void load()
    } catch {
      ctx = null
    }
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)

  useUI.subscribe((s) => {
    if (master) master.gain.value = s.settings.volume
  })

  host.onEvents((events) => {
    // Simulation sounds never play while paused; purchases made while paused still click.
    const paused = host.speed === 0
    for (const e of events) {
      const s = soundFor(e)
      if (!s || (paused && s !== 'place')) continue
      if (useUI.getState().settings.volume <= 0) continue
      play(s)
    }
  })
}

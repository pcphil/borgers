import { exportJson, importJson, serialize, toSim } from '../save/format'
import { AUTO_SLOT, openKV, SaveSlots } from '../save/slots'
import type { Command, CommandResult, Sim } from '../sim/sim'
import type { SimEvent } from '../sim/types'
import { newGame } from '../sim/world'
import { handleAutosave } from './autosave'
import { frameTicks, type Speed } from './loop'
import { makeSnapshot } from './snapshot'
import { useUI } from './store'

const PUBLISH_MS = 100

type EventListener = (events: SimEvent[]) => void

/** Owns the running Sim and the frame loop; bridges sim -> UI store, audio and autosave. */
class GameHost {
  sim: Sim | null = null
  speed: Speed = 1
  /** Interpolation factor between the previous and current tick, for rendering. */
  alpha = 0
  private acc = 0
  private raf = 0
  private last = 0
  private lastPublish = 0
  private listeners = new Set<EventListener>()
  private slotsPromise: Promise<SaveSlots> | null = null

  slots(): Promise<SaveSlots> {
    if (!this.slotsPromise)
      this.slotsPromise = openKV().then(({ kv, persistent }) => {
        useUI.getState().set({ persistent })
        return new SaveSlots(kv)
      })
    return this.slotsPromise
  }

  onEvents(fn: EventListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  start(sim: Sim) {
    this.stop()
    this.sim = sim
    this.acc = 0
    this.alpha = 0
    this.last = performance.now()
    useUI.getState().set({
      screen: 'game',
      selection: null,
      summary: null,
      tool: { kind: 'none' },
      panel: null,
    })
    this.publish()
    const loop = (t: number) => {
      this.frame(t)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  quitToMenu() {
    this.stop()
    this.sim = null
    useUI.getState().set({ screen: 'menu', snapshot: null })
  }

  private frame(t: number) {
    const sim = this.sim
    if (!sim) return
    const dt = (t - this.last) / 1000
    this.last = t
    const r = frameTicks(this.acc, dt, this.speed)
    this.acc = r.acc
    this.alpha = r.alpha
    for (let i = 0; i < r.ticks; i++) sim.step()
    const events = sim.drainEvents()
    if (events.length) this.handleEvents(events)
    if (t - this.lastPublish >= PUBLISH_MS) this.publish()
  }

  private handleEvents(events: SimEvent[]) {
    const ui = useUI.getState()
    for (const e of events) {
      if (e.type === 'dayEnded') ui.set({ summary: e.record })
      if (e.type === 'notice') ui.toast(e.text)
      if (e.type === 'starGained') ui.toast(`You earned a star! Now ${'★'.repeat(e.stars)}`)
    }
    void handleAutosave(events, ui.settings.autosave, () => this.saveTo(AUTO_SLOT, 'Autosave'))
    for (const l of this.listeners) l(events)
  }

  publish() {
    const sim = this.sim
    if (!sim) return
    this.lastPublish = performance.now()
    useUI.getState().set({ snapshot: makeSnapshot(sim, this.speed) })
  }

  dispatch(cmd: Command): CommandResult {
    if (!this.sim) return { ok: false, reason: 'noGame' }
    const r = this.sim.dispatch(cmd)
    const events = this.sim.drainEvents()
    if (events.length) this.handleEvents(events)
    this.publish()
    return r
  }

  setSpeed(s: Speed) {
    this.speed = s
    this.publish()
  }

  newGame(seed = Math.floor(Math.random() * 2 ** 31)) {
    this.start(newGame(seed))
  }

  async saveTo(id: string, name: string) {
    if (!this.sim) return
    const slots = await this.slots()
    await slots.saveSim(id, name, this.sim)
  }

  async load(id: string) {
    const slots = await this.slots()
    this.start(toSim(await slots.load(id)))
  }

  exportText(): string | null {
    return this.sim ? exportJson(serialize(this.sim)) : null
  }

  /** Validate and store an imported save in a slot. Throws SaveError on bad files. */
  async importToSlot(text: string, id: string, name: string) {
    const save = importJson(text)
    const slots = await this.slots()
    await slots.saveFile(id, name, save)
    return save
  }
}

export const host = new GameHost()

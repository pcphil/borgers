import { createStore, del, get, keys, set } from 'idb-keyval'
import type { Sim } from '../sim/sim'
import { deserialize, type SaveFile, serialize } from './format'

export const AUTO_SLOT = 'auto'

export type SlotMeta = {
  id: string
  name: string
  day: number
  cash: number
  stars: number
  savedAt: string
}

export interface KV {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
  keys(): Promise<string[]>
}

export function memoryKV(): KV {
  const m = new Map<string, unknown>()
  return {
    get: async (k) => m.get(k),
    set: async (k, v) => {
      m.set(k, structuredClone(v))
    },
    del: async (k) => {
      m.delete(k)
    },
    keys: async () => [...m.keys()],
  }
}

export function idbKV(): KV {
  const store = createStore('borgers', 'saves')
  return {
    get: (k) => get(k, store),
    set: (k, v) => set(k, v, store),
    del: (k) => del(k, store),
    keys: async () => (await keys(store)).map(String),
  }
}

/** IndexedDB when available and working; otherwise in-memory with `persistent: false`. */
export async function openKV(): Promise<{ kv: KV; persistent: boolean }> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB')
    const kv = idbKV()
    await kv.keys()
    return { kv, persistent: true }
  } catch {
    return { kv: memoryKV(), persistent: false }
  }
}

const SAVE_PREFIX = 'slot:'
const META_PREFIX = 'meta:'

export class SaveSlots {
  constructor(private kv: KV) {}

  async list(): Promise<SlotMeta[]> {
    const all = await this.kv.keys()
    const metas: SlotMeta[] = []
    for (const k of all.filter((x) => x.startsWith(META_PREFIX))) {
      const m = (await this.kv.get(k)) as SlotMeta | undefined
      if (m) metas.push(m)
    }
    // Autosave first, then newest first.
    return metas.sort((a, b) => {
      if (a.id === AUTO_SLOT) return -1
      if (b.id === AUTO_SLOT) return 1
      return b.savedAt.localeCompare(a.savedAt)
    })
  }

  async has(id: string): Promise<boolean> {
    return (await this.kv.get(META_PREFIX + id)) !== undefined
  }

  saveSim(id: string, name: string, sim: Sim): Promise<SlotMeta> {
    return this.saveFile(id, name, serialize(sim))
  }

  async saveFile(id: string, name: string, save: SaveFile): Promise<SlotMeta> {
    const meta: SlotMeta = {
      id,
      name,
      day: save.world.clock.day,
      cash: save.world.economy.cash,
      stars: save.world.stars,
      savedAt: save.savedAt,
    }
    await this.kv.set(SAVE_PREFIX + id, save)
    await this.kv.set(META_PREFIX + id, meta)
    return meta
  }

  async load(id: string): Promise<SaveFile> {
    return deserialize(await this.kv.get(SAVE_PREFIX + id))
  }

  async remove(id: string): Promise<void> {
    await this.kv.del(SAVE_PREFIX + id)
    await this.kv.del(META_PREFIX + id)
  }
}

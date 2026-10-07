import { Sim } from '../sim/sim'
import type { World } from '../sim/types'
import { SAVE_VERSION } from '../sim/world'

export const SAVE_FORMAT = 'borgers-save'

export type SaveFile = {
  format: typeof SAVE_FORMAT
  version: number
  savedAt: string
  world: World
}

export class SaveError extends Error {}

export function serialize(sim: Sim, savedAt = new Date().toISOString()): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt,
    // Deep copy so later ticks don't mutate the stored snapshot.
    world: JSON.parse(JSON.stringify(sim.world)) as World,
  }
}

type AnyRecord = Record<string, unknown>

/**
 * Migrations keyed by the version they upgrade FROM. Each returns a world one version newer.
 * v0 is the pre-release shape (no winSeen / dismissedHints) and serves as the migration template.
 */
export const MIGRATIONS: Record<number, (w: AnyRecord) => AnyRecord> = {
  0: (w) => ({ ...w, winSeen: w.winSeen ?? false, dismissedHints: w.dismissedHints ?? [] }),
  // v2: the open/prep flow and street legs. Old groups are already inside the lot.
  1: (w) => ({
    ...w,
    rush: Array.isArray(w.rush) ? w.rush : new Array<number>(13).fill(1),
    groups: Object.fromEntries(
      Object.entries((w.groups ?? {}) as Record<string, AnyRecord>).map(([id, g]) => [
        id,
        { ...g, side: g.side ?? 1 },
      ]),
    ),
  }),
}

export function migrate(world: AnyRecord, from: number, to = SAVE_VERSION): AnyRecord {
  let w = world
  for (let v = from; v < to; v++) {
    const m = MIGRATIONS[v]
    if (!m) throw new SaveError(`No migration from save version ${v}`)
    w = { ...m(w), version: v + 1 }
  }
  return w
}

const isObj = (x: unknown): x is AnyRecord =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function assertWorld(w: unknown): asserts w is World {
  if (!isObj(w)) throw new SaveError('Save has no world')
  const need: [string, (x: unknown) => boolean][] = [
    ['seed', isNum],
    ['nextId', isNum],
    ['stars', isNum],
    ['rng', (x) => Array.isArray(x) && x.length === 4 && x.every(isNum)],
    ['clock', (x) => isObj(x) && isNum(x.day) && isNum(x.tick) && typeof x.phase === 'string'],
    ['layout', (x) => isObj(x) && isNum(x.w) && isNum(x.h) && Array.isArray(x.zones)],
    ['economy', (x) => isObj(x) && isNum(x.cash) && isObj(x.today) && Array.isArray(x.history)],
    ['inventory', (x) => isObj(x) && isObj(x.stock) && isObj(x.reserved)],
    ['reputation', (x) => isObj(x) && isNum(x.value) && Array.isArray(x.scores)],
    ['menu', isObj],
    ['objects', isObj],
    ['groups', isObj],
    ['staff', isObj],
    ['orders', isObj],
    ['tasks', isObj],
    ['trash', isObj],
    ['candidates', Array.isArray],
    ['dismissedHints', Array.isArray],
    ['rush', (x) => Array.isArray(x) && x.length === 13 && x.every(isNum)],
  ]
  for (const [k, ok] of need) if (!ok(w[k])) throw new SaveError(`Save is corrupt (${k})`)
}

/** Parse, validate and migrate a save. Throws SaveError on anything invalid. */
export function deserialize(data: unknown): SaveFile {
  if (!isObj(data) || data.format !== SAVE_FORMAT) throw new SaveError('Not a borgers save file')
  if (!isNum(data.version)) throw new SaveError('Save has no version')
  if (data.version > SAVE_VERSION)
    throw new SaveError(
      `This save is from a newer version of the game (v${data.version}). Update the game to load it.`,
    )
  if (!isObj(data.world)) throw new SaveError('Save has no world')
  const world = migrate(data.world, data.version)
  assertWorld(world)
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'string' ? data.savedAt : '',
    world,
  }
}

export const toSim = (save: SaveFile) => new Sim(save.world)

export const exportJson = (save: SaveFile) => JSON.stringify(save)

export function importJson(text: string): SaveFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new SaveError('File is not valid JSON')
  }
  return deserialize(data)
}

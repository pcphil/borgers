import { host } from './host'

/** Dev/test hook: exposes the host on window for scripted playtests (not used by the game). */
export function exposeDebug() {
  ;(window as unknown as { borgers: unknown }).borgers = { host }
}

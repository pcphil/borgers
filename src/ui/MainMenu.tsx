import { useState } from 'react'
import { host } from '../app/host'
import { useUI } from '../app/store'
import { Button, Panel } from './common'
import { ImportButton, SlotList, useSlots } from './Saves'

export function MainMenu() {
  const { slots, refresh } = useSlots()
  const [showLoad, setShowLoad] = useState(false)
  const latest = slots?.[0]
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-amber-300 via-orange-300 to-red-400 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <div className="text-center">
          <div className="text-6xl">🍔</div>
          <h1 className="text-5xl font-black tracking-tight text-red-800 drop-shadow">borgers</h1>
          <p className="text-amber-950/80">Build and run the best burger joint in town.</p>
        </div>
        {showLoad ? (
          <Panel title="Load game" onClose={() => setShowLoad(false)} className="w-full">
            {slots ? (
              <SlotList
                slots={slots}
                onLoad={(id) => void host.load(id)}
                onDelete={async (id) => {
                  await (await host.slots()).remove(id)
                  await refresh()
                }}
              />
            ) : null}
            <div className="mt-2">
              <ImportButton onDone={() => void refresh()} />
            </div>
          </Panel>
        ) : (
          <div className="flex w-64 flex-col gap-2">
            <Button variant="primary" className="py-2 text-lg" onClick={() => host.newGame()}>
              New game
            </Button>
            <Button
              className="py-2"
              disabled={!latest}
              onClick={() => latest && void host.load(latest.id)}
            >
              Continue
            </Button>
            <Button className="py-2" onClick={() => setShowLoad(true)}>
              Load / Import
            </Button>
            <Button className="py-2" onClick={() => useUI.getState().set({ settingsOpen: true })}>
              Settings
            </Button>
          </div>
        )}
        <p className="text-xs text-amber-950/70">
          WASD / drag to pan · wheel to zoom · Q/E rotate · Space pause · 1–3 speed
        </p>
      </div>
    </div>
  )
}

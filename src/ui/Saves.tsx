import { useCallback, useEffect, useRef, useState } from 'react'
import { host } from '../app/host'
import { money } from '../app/snapshot'
import { useUI } from '../app/store'
import { SaveError } from '../save/format'
import { AUTO_SLOT, type SlotMeta } from '../save/slots'
import { Button, Panel, Stars } from './common'

export function useSlots() {
  const [slots, setSlots] = useState<SlotMeta[] | null>(null)
  const refresh = useCallback(async () => {
    const s = await host.slots()
    setSlots(await s.list())
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { slots, refresh }
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File input that validates a save and stores it in a new slot. */
export function ImportButton({ onDone }: { onDone: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button onClick={() => input.current?.click()}>Import…</Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        data-testid="import-input"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            const id = `import-${Date.now()}`
            await host.importToSlot(await file.text(), id, file.name.replace(/\.json$/, ''))
            useUI.getState().toast('Save imported.')
            onDone(id)
          } catch (err) {
            useUI
              .getState()
              .toast(err instanceof SaveError ? `Import failed: ${err.message}` : 'Import failed.')
          }
        }}
      />
    </>
  )
}

export function SlotList({
  slots,
  onLoad,
  onOverwrite,
  onDelete,
}: {
  slots: SlotMeta[]
  onLoad: (id: string) => void
  onOverwrite?: (s: SlotMeta) => void
  onDelete?: (id: string) => void
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  if (!slots.length) return <p className="text-amber-900/70">No saves yet.</p>
  return (
    <div className="space-y-1">
      {slots.map((s) => (
        <div key={s.id} className="rounded-lg border border-amber-900/15 bg-white p-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{s.id === AUTO_SLOT ? '⏱ Autosave' : s.name}</span>
            <Stars n={s.stars} />
          </div>
          <div className="text-xs text-amber-900/60">
            Day {s.day} · {money(s.cash)} · {s.savedAt ? new Date(s.savedAt).toLocaleString() : ''}
          </div>
          {confirm === s.id ? (
            <div className="mt-1 flex items-center gap-1 text-xs">
              <span className="flex-1">Overwrite this save?</span>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirm(null)
                  onOverwrite?.(s)
                }}
              >
                Overwrite
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex gap-1">
              <Button onClick={() => onLoad(s.id)}>Load</Button>
              {onOverwrite && s.id !== AUTO_SLOT ? (
                <Button onClick={() => setConfirm(s.id)}>Save here</Button>
              ) : null}
              {onDelete ? (
                <Button variant="ghost" onClick={() => onDelete(s.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function SavesPanel() {
  const { slots, refresh } = useSlots()
  const persistent = useUI((s) => s.persistent)
  const day = useUI((s) => s.snapshot?.day)
  const [name, setName] = useState('')
  const closeIt = () => useUI.getState().setPanel(null)
  const save = async (id: string, label: string) => {
    await host.saveTo(id, label)
    useUI.getState().toast(`Saved “${label}”.`)
    await refresh()
  }
  return (
    <Panel title="Save & load" onClose={closeIt} className="w-80">
      {!persistent ? (
        <p className="mb-2 rounded bg-orange-100 p-2 text-xs">
          Browser storage is unavailable: saves last only for this session. Use Export to keep them.
        </p>
      ) : null}
      <div className="mb-3 flex gap-1">
        <input
          className="flex-1 rounded border border-amber-900/20 px-2"
          placeholder={`Day ${day ?? 1}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="primary"
          onClick={() => {
            const label = name.trim() || `Day ${day ?? 1}`
            setName('')
            void save(`slot-${Date.now()}`, label)
          }}
        >
          New save
        </Button>
      </div>
      <div className="mb-3 flex gap-1">
        <Button
          onClick={() => {
            const text = host.exportText()
            if (text) downloadText(`borgers-day${day ?? 1}.json`, text)
          }}
        >
          Export current
        </Button>
        <ImportButton onDone={() => void refresh()} />
      </div>
      {slots ? (
        <SlotList
          slots={slots}
          onLoad={(id) => void host.load(id)}
          onOverwrite={(s) => void save(s.id, s.name)}
          onDelete={async (id) => {
            await (await host.slots()).remove(id)
            await refresh()
          }}
        />
      ) : null}
    </Panel>
  )
}

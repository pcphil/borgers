import { expect, type Page, test } from '@playwright/test'

/** Screen position of a tile centre, using the live R3F camera. */
async function tileToScreen(page: Page, x: number, y: number) {
  return page.evaluate(
    ([tx, ty]) => {
      const w = window as unknown as Record<string, any>
      const { camera, size } = w.__borgersCamera
      const v = new camera.position.constructor(tx, 0, ty).project(camera)
      const rect = document.querySelector('canvas')!.getBoundingClientRect()
      return {
        x: rect.left + ((v.x + 1) / 2) * size.width,
        y: rect.top + ((1 - v.y) / 2) * size.height,
      }
    },
    [x, y],
  )
}

// Bins on the front, back, left and right edge of the starter lot (12x10), clear of the entrance.
const SPOTS = [
  { x: 6, y: 0, wall: 'front' },
  { x: 6, y: 9, wall: 'back' },
  { x: 0, y: 1, wall: 'left' },
  { x: 11, y: 0, wall: 'right' },
]

test('objects against each wall can be selected by clicking, from every rotation', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New game' }).click()
  for (const s of SPOTS) {
    const ok = await page.evaluate(
      (p) =>
        (window as any).borgers.host.dispatch({ type: 'place', def: 'bin', x: p.x, y: p.y, rot: 0 })
          .ok,
      s,
    )
    expect(ok, `place bin at ${s.wall}`).toBe(true)
  }
  await page.waitForTimeout(500)
  for (let r = 0; r < 4; r++) {
    for (const s of SPOTS) {
      const at = await tileToScreen(page, s.x, s.y)
      // Picking is by ground tile, so click the tile centre.
      await page.mouse.click(at.x, at.y)
      await expect(page.getByText('Trash bin'), `${s.wall} wall, rotation ${r}`).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByText('Trash bin')).toBeHidden()
    }
    await page.keyboard.press('e')
    await page.waitForTimeout(700)
  }
})

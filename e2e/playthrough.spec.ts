import { readFileSync } from 'node:fs'
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

/** Play `days` days in-page with the scripted competent player (src/dev/autopilot.ts). */
const playDays = (page: Page, days: number) =>
  page.evaluate((n) => (window as any).borgers.autoplay(n), days) as Promise<{
    day: number
    stars: number
    cash: number
  }>

test('playthrough: hire, build during service, reach 3 stars, save/export/import/load', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'New game' }).click()

  // Hire the three starting candidates through the Staff panel.
  await page.keyboard.press('h')
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Hire' }).first().click()
  await expect(page.getByText(/Your team \(3\)/i)).toBeVisible()
  await page.keyboard.press('h')

  // Open the restaurant and let service run, then place a trash bin by clicking the floor while customers are inside.
  await page.getByTestId('open-button').click()
  await page.getByRole('button', { name: '▶▶▶' }).click()
  await page.waitForFunction(
    () => Object.keys((window as any).borgers.host.sim.world.groups).length > 0,
    undefined,
    { timeout: 30_000 },
  )
  const objectsBefore = await page.evaluate(
    () => Object.keys((window as any).borgers.host.sim.world.objects).length,
  )
  await page.keyboard.press('b')
  await page.getByRole('button', { name: /Trash bin/ }).click()
  const spot = await tileToScreen(page, 11, 0)
  await page.mouse.move(spot.x, spot.y)
  await page.mouse.click(spot.x, spot.y)
  await expect
    .poll(() =>
      page.evaluate(() => Object.keys((window as any).borgers.host.sim.world.objects).length),
    )
    .toBe(objectsBefore + 1)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  // Play until 3 stars.
  let state = await playDays(page, 1)
  for (let i = 0; i < 25 && state.stars < 3; i++) state = await playDays(page, 1)
  expect(state.stars).toBeGreaterThanOrEqual(3)
  await page
    .getByRole('button', { name: 'Continue' })
    .click({ timeout: 2000 })
    .catch(() => {})

  // Save to a slot and export to a file.
  await page.getByRole('button', { name: /Save/ }).first().click()
  await page.getByPlaceholder(/Day/).fill('three stars')
  await page.getByRole('button', { name: 'New save' }).click()
  await expect(page.getByText('Saved “three stars”.')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export current' }).click()
  const file = await (await download).path()
  const exported = JSON.parse(readFileSync(file, 'utf8'))
  expect(exported.world.stars).toBe(state.stars)

  // Quit, import the exported file, load it and check the game resumes where it was.
  await page.getByTitle('Settings').click()
  await page.getByRole('button', { name: 'Quit to main menu' }).click()
  await page.getByRole('button', { name: 'Load / Import' }).click()
  await page.getByTestId('import-input').setInputFiles(file)
  await expect(page.getByText('Save imported.')).toBeVisible()
  const imported = page.locator('div').filter({ hasText: /^Day \d+/ })
  await expect(imported.first()).toBeVisible()
  await page.getByRole('button', { name: 'Load', exact: true }).last().click()
  await expect(page.getByTestId('hud-clock')).toContainText(`Day ${state.day}`)
  const loaded = await page.evaluate(() => (window as any).borgers.host.sim.world.stars)
  expect(loaded).toBe(state.stars)
  expect(errors).toEqual([])
})

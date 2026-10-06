import { expect, test } from '@playwright/test'

test('new game renders the canvas and the clock advances', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'borgers' })).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(600)
  const clock = page.getByTestId('hud-clock')
  await expect(clock).toContainText('Day 1')
  const first = await clock.textContent()
  await page.getByRole('button', { name: '▶▶▶' }).click()
  await expect.poll(async () => clock.textContent(), { timeout: 15_000 }).not.toBe(first)
  expect(errors).toEqual([])
})

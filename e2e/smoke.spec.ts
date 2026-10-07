import { expect, test } from '@playwright/test'

test('new game waits in prep, then the clock advances once opened', async ({ page }) => {
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
  await expect(clock).toContainText('Preparing')
  const first = await clock.textContent()
  await page.getByRole('button', { name: '▶▶▶' }).click()
  await page.waitForTimeout(1500)
  expect(await clock.textContent()).toBe(first) // frozen until the restaurant opens
  await page.getByTestId('open-button').click()
  await expect(clock).toContainText('Open')
  await expect(page.getByTestId('open-button')).toHaveCount(0)
  await expect.poll(async () => clock.textContent(), { timeout: 15_000 }).not.toBe(first)
  expect(errors).toEqual([])
})

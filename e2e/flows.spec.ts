import { expect, test } from '@playwright/test'

test('settings persist across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  const shadows = page.getByLabel('Shadows')
  const before = await shadows.isChecked()
  await shadows.click()
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Shadows')).toBeChecked({ checked: !before })
})

test('save, quit and load restores the game', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New game' }).click()
  await page.keyboard.press('Space')
  // Spend money so the save is distinguishable from a new game.
  await page.keyboard.press('h')
  await page.getByRole('button', { name: 'Hire' }).first().click()
  await page.getByRole('button', { name: /Save/ }).first().click()
  await page.getByPlaceholder(/Day/).fill('e2e save')
  await page.getByRole('button', { name: 'New save' }).click()
  await expect(page.getByText('Saved “e2e save”.')).toBeVisible()
  await page.getByTitle('Settings').click()
  await page.getByRole('button', { name: 'Quit to main menu' }).click()
  await page.getByRole('button', { name: 'Load / Import' }).click()
  await expect(page.getByText('e2e save', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load', exact: true }).first().click()
  await expect(page.getByTestId('hud-clock')).toContainText('Day 1')
  await page.keyboard.press('h')
  await expect(page.getByText(/Your team \(1\)/i)).toBeVisible()
})

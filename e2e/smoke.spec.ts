import { expect, test } from '@playwright/test'

test('page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('borgers')).toBeVisible()
})

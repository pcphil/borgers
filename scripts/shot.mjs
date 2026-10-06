// Dev helper: screenshot the running app. Usage: node scripts/shot.mjs <url> <out.png> [actions...]
// Actions: click:<button text> | wait:<ms> | key:<key> | eval:<js>
import { chromium } from '@playwright/test'

const [url = 'http://localhost:5199/', out = 'shot.png', ...actions] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 860 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
await page.goto(url)
for (const a of actions) {
  const [kind, ...rest] = a.split(':')
  const arg = rest.join(':')
  if (kind === 'click') await page.getByRole('button', { name: arg, exact: true }).first().click()
  else if (kind === 'wait') await page.waitForTimeout(Number(arg))
  else if (kind === 'key') await page.keyboard.press(arg)
  else if (kind === 'eval') console.log('eval:', await page.evaluate(arg))
  else if (kind === 'mouse') {
    const [x, y] = arg.split(',').map(Number)
    await page.mouse.click(x, y)
  }
}
await page.screenshot({ path: out })
console.log(
  logs
    .filter((l) => !l.includes('[vite]'))
    .slice(-25)
    .join('\n'),
)
await browser.close()

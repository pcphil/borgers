// Perf budget check (task 11.8): node scripts/perf.mjs [url] [--headed]
// Loads the stress scene (100 agents, 150 objects, shadows off) and reports average FPS.
import { chromium } from '@playwright/test'

const url = process.argv[2] ?? 'http://localhost:4173/'
const headed = process.argv.includes('--headed')
const software = process.argv.includes('--software')
const browser = await chromium.launch({
  headless: !headed,
  args: software
    ? ['--use-gl=angle', '--use-angle=swiftshader']
    : [
        '--use-angle=d3d11',
        '--enable-gpu',
        '--ignore-gpu-blocklist',
        '--disable-gpu-vsync',
        '--disable-frame-rate-limit',
      ],
})
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto(url)
await page.evaluate(() =>
  localStorage.setItem('borgers:settings', JSON.stringify({ shadows: false })),
)
await page.reload()
const scene = await page.evaluate(() => window.borgers.stress())
await page.waitForTimeout(3000) // let models load and shaders compile
const renderer = await page.evaluate(() => {
  const gl = document.querySelector('canvas')?.getContext('webgl2')
  const ext = gl?.getExtension('WEBGL_debug_renderer_info')
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
})
const fps = await page.evaluate(() => window.borgers.measureFps(6000))
const info = await page.evaluate(() => {
  const r = window.__borgersRender
  return r ? { calls: r.calls, triangles: r.triangles } : null
})
console.log(JSON.stringify({ scene, renderer, fps: Math.round(fps * 10) / 10, info }))
await browser.close()

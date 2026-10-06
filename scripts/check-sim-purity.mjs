// Fails if src/sim contains nondeterministic or render/UI dependencies (design D4).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? 'src/sim'
const banned = [
  [/from ['"](react|react-dom|three|@react-three\/[^'"]+|zustand)['"]/, 'render/UI import'],
  [/\bMath\.random\b/, 'Math.random'],
  [/\bDate\.now\b/, 'Date.now'],
  [/\bnew Date\b/, 'new Date'],
  [/\bperformance\.now\b/, 'performance.now'],
]

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
  })
}

let failures = 0
for (const file of walk(root)) {
  if (file.endsWith('.test.ts')) continue
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const [re, label] of banned) {
        if (re.test(line)) {
          console.error(`${file}:${i + 1}: banned ${label}`)
          failures++
        }
      }
    })
}
if (failures) {
  console.error(`sim purity check failed (${failures})`)
  process.exit(1)
}
console.log('sim purity check ok')

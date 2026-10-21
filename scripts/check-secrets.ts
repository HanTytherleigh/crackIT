// Scans the build output for obvious secret patterns and fails if any are found.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const patterns: [string, RegExp][] = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI-style key', /sk-[A-Za-z0-9]{32,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Bearer token', /Bearer\s+[A-Za-z0-9._-]{20,}/],
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const dir = process.argv[2] ?? 'dist'
const hits: string[] = []
for (const file of walk(dir)) {
  if (/\.(png|jpe?g|webp|woff2?)$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const [name, re] of patterns) if (re.test(text)) hits.push(`${file}: ${name}`)
}

if (hits.length) {
  console.error('Possible secrets found in build output:\n' + hits.join('\n'))
  process.exit(1)
}
console.log(`No secret patterns found in ${dir}/`)

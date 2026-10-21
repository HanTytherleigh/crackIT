// Renders the PNG icons used by the manifest and iOS from public/icons/icon.svg.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icons/icon.svg')
// iOS and maskable icons need a full-bleed square, so drop the rounded corners.
const square = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'))
// Maskable icons keep content inside the central 80% safe zone.
const maskable = Buffer.from(
  square.toString().replace('<g ', '<g transform="translate(51.2 51.2) scale(0.8)" ').replace(/<circle /g, '<circle transform="translate(51.2 51.2) scale(0.8)" '),
)

await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png')
await sharp(square).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
await sharp(maskable).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png')
console.log('icons written')

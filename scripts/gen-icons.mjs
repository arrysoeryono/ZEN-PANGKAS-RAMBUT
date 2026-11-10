/**
 * Generate ikon PWA ZEN dari SVG (brand: vermillion + gunting putih)
 * Jalankan: bun scripts/gen-icons.mjs
 */

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/icons')
mkdirSync(OUT, { recursive: true })

const SCISSORS = `
  <g stroke="#FFF7F3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"
     transform="translate(15.5, 15.5) scale(1.375)">
    <circle cx="6" cy="6" r="3" fill="none"/>
    <circle cx="6" cy="18" r="3" fill="none"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </g>`

function appIcon(size, radiusRatio = 0.28) {
  const r = Math.round(size * radiusRatio)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="${(r / size) * 64}" fill="#E24C3B"/>
    ${SCISSORS}
  </svg>`
}

/** Maskable: latar full-bleed + konten di zona aman 80% */
function maskableIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#E24C3B"/>
    <g transform="translate(6.4, 6.4) scale(0.8)">
      ${SCISSORS}
    </g>
  </svg>`
}

const targets = [
  { name: 'icon-192.png', svg: appIcon(192), size: 192 },
  { name: 'icon-512.png', svg: appIcon(512), size: 512 },
  { name: 'maskable-512.png', svg: maskableIcon(512), size: 512 },
  { name: 'apple-touch-icon.png', svg: appIcon(180, 0), size: 180 }, // iOS: tanpa sudut transparan
]

for (const t of targets) {
  const png = await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png({ quality: 95 })
    .toBuffer()
  writeFileSync(path.join(OUT, t.name), png)
  console.log(`OK ${t.name} (${t.size}px)`)
}

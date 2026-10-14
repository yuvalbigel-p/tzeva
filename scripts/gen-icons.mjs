#!/usr/bin/env node
// Generates the home-screen app icon.
//
// The gradient wheel is rendered by the app's own drawWheel() (src/wheelRender.ts,
// bundled with esbuild and run in headless Chrome against a real <canvas>), so the
// icon is pixel-for-pixel the same wheel the app draws — not a re-derived
// approximation. "Tzeva" is converted from the Pacifico font to real vector paths
// with opentype.js, so the generated PNGs don't depend on any font being
// installed on the machine that renders them.
//
// Usage: node scripts/gen-icons.mjs
//
// Writes:
//   assets/icon.svg            - master source (full-bleed icon)
//   assets/icon-maskable.svg   - source for the padded maskable variant
//   public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png,
//   public/icon-maskable-512.png

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import opentype from 'opentype.js'
import puppeteer from 'puppeteer-core'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const path = (...p) => resolve(ROOT, ...p)

const ICON = 512 // viewBox units for both master SVGs
const BG = '#1e1e1e'
const WHEEL_PX = 1024 // bitmap resolution for the embedded wheel, downscaled when rasterized
const WHEEL_R = 200 // wheel radius, in icon units
const TEXT_WIDTH = 0.85 * (2 * WHEEL_R) // "fills most of the wheel's width"
const OUTLINE = ICON * 0.025 // ~2.5% of icon width
const FONT_FILE = path('node_modules/@fontsource/satisfy/files/satisfy-latin-400-normal.woff')

function findChrome() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ]
  for (const c of candidates) {
    try {
      readFileSync(c)
      return c
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'No Chrome/Chromium found. Install Google Chrome, or set CHROME_PATH to its executable.',
  )
}

/** The real wheel-drawing code, reused (not re-derived): bundled so it can run standalone in a page. */
async function bundleDrawWheel() {
  const result = await build({
    entryPoints: [path('src/wheelRender.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'TzevaWheel',
    target: 'es2020',
  })
  return result.outputFiles[0].text
}

/** Renders the app's actual gradient wheel (no marker) at high resolution, via headless Chrome. */
async function renderWheelPng(browser, bundleCode) {
  const page = await browser.newPage()
  await page.setViewport({ width: WHEEL_PX, height: WHEEL_PX })
  await page.setContent(`<canvas id="c" width="${WHEEL_PX}" height="${WHEEL_PX}"></canvas>`)
  await page.addScriptTag({ content: bundleCode })
  await page.evaluate(() => {
    const canvas = document.getElementById('c')
    // mode 'gradient', wheel 'rgb', brightness 1 - matches the app's default wheel.
    window.TzevaWheel.drawWheel(canvas, 1, 'gradient', 'rgb', '#1e1e1e')
  })
  const png = await (await page.$('#c')).screenshot({ omitBackground: true })
  await page.close()
  return png
}

/**
 * "Tzeva" as two stacked SVG path elements (stroke-only behind, fill-only on top) -
 * the same visual effect as paint-order:stroke, but not dependent on the rasterizer
 * supporting that property. Scaled to TEXT_WIDTH and centered at (0,0).
 */
function textPaths() {
  const fontBuf = readFileSync(FONT_FILE)
  const font = opentype.parse(new Uint8Array(fontBuf).buffer)
  const probe = font.getPath('Tzeva', 0, 0, 300)
  const bbox = probe.getBoundingBox()
  const naturalWidth = bbox.x2 - bbox.x1
  const scale = TEXT_WIDTH / naturalWidth
  const cx = (bbox.x1 + bbox.x2) / 2
  const cy = (bbox.y1 + bbox.y2) / 2
  const d = probe.toPathData(2)
  const transform = `scale(${scale}) translate(${-cx} ${-cy})`
  return `<g transform="${transform}">
    <path d="${d}" fill="none" stroke="${BG}" stroke-width="${(OUTLINE / scale).toFixed(2)}" stroke-linejoin="round" />
    <path d="${d}" fill="#fff" />
  </g>`
}

/** Composes the master SVG. `scale` < 1 shrinks the wheel+text group for the maskable safe zone. */
function composeSvg(wheelPngBase64, scale = 1) {
  const c = ICON / 2
  const r = WHEEL_R * scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON} ${ICON}">
  <rect width="${ICON}" height="${ICON}" fill="${BG}" />
  <defs>
    <clipPath id="wheel-clip"><circle cx="${c}" cy="${c}" r="${r}" /></clipPath>
  </defs>
  <image
    href="data:image/png;base64,${wheelPngBase64}"
    x="${c - r}" y="${c - r}" width="${r * 2}" height="${r * 2}"
    clip-path="url(#wheel-clip)"
    preserveAspectRatio="xMidYMid slice"
  />
  <g transform="translate(${c} ${c}) scale(${scale})">
    ${textPaths()}
  </g>
</svg>`
}

async function rasterize(browser, svg, size, outFile) {
  const page = await browser.newPage()
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><head><style>
    html,body{margin:0}
    svg{display:block;width:${size}px;height:${size}px}
  </style></head><body>${svg}</body></html>`)
  const el = await page.$('svg')
  await el.screenshot({ path: outFile })
  await page.close()
}

async function main() {
  const chrome = process.env.CHROME_PATH || findChrome()
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true })

  console.log('Bundling drawWheel()...')
  const bundle = await bundleDrawWheel()

  console.log('Rendering the gradient wheel...')
  const wheelPng = await renderWheelPng(browser, bundle)
  const wheelBase64 = wheelPng.toString('base64')

  console.log('Composing icon SVGs...')
  const svg = composeSvg(wheelBase64, 1)
  const maskableSvg = composeSvg(wheelBase64, 0.72)
  writeFileSync(path('assets/icon.svg'), svg)
  writeFileSync(path('assets/icon-maskable.svg'), maskableSvg)

  console.log('Rasterizing PNGs...')
  await rasterize(browser, svg, 180, path('public/apple-touch-icon.png'))
  await rasterize(browser, svg, 192, path('public/icon-192.png'))
  await rasterize(browser, svg, 512, path('public/icon-512.png'))
  await rasterize(browser, maskableSvg, 512, path('public/icon-maskable-512.png'))

  await browser.close()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

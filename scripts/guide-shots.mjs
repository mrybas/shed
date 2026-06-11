// Regenerates the Guide screenshots (public/guide/*.webp) from a running dev
// server. Deterministic state is seeded per shot, so the pictures come out
// consistent (dark theme, coral accent, same widths) on every run.
//
//   npm run dev        # in another terminal (or already running)
//   node scripts/guide-shots.mjs
import { chromium } from '@playwright/test'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'

const BASE = process.env.SHOTS_BASE || 'http://localhost:5173'
const OUT = new URL('../public/guide/', import.meta.url).pathname
const TMP = '/tmp/guide-shots'
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

// One 4-bar user exercise with a section label, used by several shots.
const INSTR = ['crash', 'ride', 'hihatOpen', 'hihatClosed', 'hihatPedal', 'tom1', 'tom2', 'snare', 'floorTom', 'kick']
function demoExercise() {
  const n = 4 * 8
  const rows = {}
  INSTR.forEach((k) => { rows[k] = Array.from({ length: n }, () => ({ on: false, accent: false, roll: 0 })) })
  for (let i = 0; i < n; i++) rows.hihatClosed[i] = { on: true, accent: i % 8 === 0, roll: 0 }
  for (let i = 2; i < n; i += 4) rows.snare[i] = { on: true, accent: true, roll: 0 }
  for (let i = 0; i < n; i += 4) rows.kick[i] = { on: true, accent: false, roll: 0 }
  rows.kick[11] = { on: true, accent: false, roll: 0 }
  rows.kick[27] = { on: true, accent: false, roll: 0 }
  return {
    version: 1, app: 'drums', id: 'guide_demo', name: 'Verse groove', bpm: 96,
    timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth',
    beatSubs: ['eighth', 'eighth', 'eighth', 'eighth'],
    instruments: INSTR, rows,
    sticking: Array.from({ length: n }, () => ''),
    source: 'user', section: null, number: null, page: null, tags: [],
    bars: Array.from({ length: 4 }, () => ({ ts: { beats: 4, unit: 4 }, beatSubs: ['eighth', 'eighth', 'eighth', 'eighth'] })),
    sections: [{ bar: 0, label: 'Intro' }, { bar: 2, label: 'Chorus' }],
  }
}

const dayKey = (off = 0) => {
  const d = new Date(Date.now() - off * 864e5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function seedStorage() {
  const days = {}
  ;[0, 1, 2, 4, 5, 7, 8, 9, 11, 14, 15, 18, 21, 22, 25].forEach((off, i) => {
    days[dayKey(off)] = { seconds: 300 + (i * 137) % 1500, byExercise: { sc_sb_1: 300, gv_disco: 200 } }
  })
  return {
    'drums.library': JSON.stringify([demoExercise()]),
    drums2_journal: JSON.stringify({
      days,
      tempo: {
        sc_sb_1: { best: 126, last: 122, goal: 140, history: [[14, 96], [11, 104], [9, 100], [7, 112], [5, 108], [3, 118], [1, 114], [0, 126]].map(([off, bpm]) => ({ d: dayKey(off), bpm })) },
        gv_disco: { best: 118, last: 118, history: [[8, 104], [6, 112], [4, 106], [2, 118], [0, 115]].map(([off, bpm]) => ({ d: dayKey(off), bpm })) },
      },
    }),
    drums2_favs: JSON.stringify(['sc_sb_1', 'gv_disco']),
    drums2_setlist: JSON.stringify(['fs_money_beat', 'gv_disco', 'sc_sb_1']),
    drums2_tw: JSON.stringify({ theme: 'dark', accent: 'coral', density: 'regular' }),
  }
}

function makeWavBuffer() {
  const rate = 8000, n = 400
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(((i >> 2) % 2 ? 12000 : -12000), 44 + i * 2)
  return buf
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1180, height: 940 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const seeds = seedStorage()
await page.addInitScript((kv) => { Object.entries(kv).forEach(([k, v]) => localStorage.setItem(k, v)) }, seeds)

const shots = []
async function shot(name, locator, opts = {}) {
  const path = `${TMP}/${name}.png`
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {})
  await page.waitForTimeout(120)
  if (opts.pad) {
    const box = await locator.boundingBox()
    const pad = opts.pad
    const vp = page.viewportSize()
    await page.screenshot({
      path,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: Math.min(vp.width, box.width + pad * 2),
        height: Math.min(vp.height, box.height + pad * 2),
      },
    })
  } else {
    await locator.screenshot({ path, ...opts })
  }
  shots.push(name)
  console.log('  •', name)
}

// The fixed player bar bleeds into element screenshots — hide it (and the
// bottom nav) for everything except the shots that ARE about the bar.
async function hideBar(hidden) {
  await page.evaluate((h) => {
    let el = document.getElementById('shot-mask')
    if (!el) {
      el = document.createElement('style')
      el.id = 'shot-mask'
      document.head.appendChild(el)
    }
    el.textContent = h ? '.playerbar,.bottomnav{display:none !important}' : ''
  }, hidden)
}

const goLib = () => page.locator('.side-parent-main').click()

// --- Metronome page -------------------------------------------------------
await page.goto(BASE)
await hideBar(true)
await page.locator('.metroview select.select').selectOption('7/8')
await page.locator('.accent-presets .fchip', { hasText: '2+2+3' }).click()
await shot('metro-accents', page.locator('.metro-stage'))
await page.locator('.metroview select.select').selectOption('4/4')

await page.locator('.metroview .ramp-block').first().locator('input[type="checkbox"]').check({ force: true })
await page.locator('.metroview .ramp-block').nth(1).locator('input[type="checkbox"]').check({ force: true })
await shot('metro-trainers', page.locator('.ctl-grid .group').first(), { pad: 18 })
await shot('poly', page.locator('.metroview .ramp-block').nth(1), { pad: 18 })
await page.locator('.metroview .ramp-block').first().locator('input[type="checkbox"]').uncheck({ force: true })
await page.locator('.metroview .ramp-block').nth(1).locator('input[type="checkbox"]').uncheck({ force: true })

await page.locator('.metroview .cs-slot', { hasText: 'Beat' }).locator('input[type="file"]')
  .setInputFiles({ name: 'sidestick.wav', mimeType: 'audio/wav', buffer: makeWavBuffer() })
await page.locator('.metroview .cs-name').waitFor()
await shot('click-sound', page.locator('.metroview .clicksound'), { pad: 18 })

// --- Library home ----------------------------------------------------------
await goLib()
await page.locator('.sec-label', { hasText: 'Favorites' }).waitFor()
await page.evaluate(() => window.scrollTo(0, 0))
const lib = await page.locator('.library2').boundingBox()
await page.screenshot({ path: `${TMP}/library.png`, clip: { x: lib.x, y: Math.max(0, lib.y), width: lib.width, height: 560 } })
shots.push('library'); console.log('  • library')
const sr = page.locator('.sec-label', { hasText: 'Sight reading' })
await sr.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }))
await page.waitForTimeout(120)
const srBox = await sr.boundingBox()
await page.screenshot({ path: `${TMP}/sightreading.png`, clip: { x: srBox.x - 8, y: srBox.y - 8, width: 980, height: 250 } })
shots.push('sightreading'); console.log('  • sightreading')
const coll = page.locator('.sec-row', { has: page.locator('.sec-label', { hasText: 'Collections' }) })
await coll.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
await page.waitForTimeout(120)
const collBox = await coll.boundingBox()
await page.screenshot({ path: `${TMP}/export.png`, clip: { x: collBox.x - 8, y: collBox.y - 8, width: collBox.width + 16, height: collBox.height + 130 } })
shots.push('export'); console.log('  • export')

// --- Practice: notes with loop + section, goal chip, actions ---------------
await page.locator('.side-subitem', { hasText: 'Saved' }).click()
await page.locator('.exrow', { hasText: 'Verse groove' }).click()
await page.locator('.notation-wrap .vf-line svg').first().waitFor()
await page.locator('.note-seclabel', { hasText: 'Chorus' }).click() // loops the section
await shot('notes-loop', page.locator('.notation-wrap'))
// trainer blocks in the options card
const trainerBlock = (label) => page.locator('.practice .ramp-block', { has: page.locator('.switch-label', { hasText: label }) })
await trainerBlock('Speed trainer').locator('input[type="checkbox"]').check({ force: true })
await shot('speed-trainer', trainerBlock('Speed trainer'), { pad: 16 })
await trainerBlock('Speed trainer').locator('input[type="checkbox"]').uncheck({ force: true })
await trainerBlock('Gap trainer').locator('input[type="checkbox"]').check({ force: true })
await shot('gap-trainer', trainerBlock('Gap trainer'), { pad: 16 })
await trainerBlock('Gap trainer').locator('input[type="checkbox"]').uncheck({ force: true })
await trainerBlock('Count-in').locator('input[type="checkbox"]').check({ force: true })
await shot('count-in', trainerBlock('Count-in'), { pad: 16 })
await trainerBlock('Count-in').locator('input[type="checkbox"]').uncheck({ force: true })
await shot('volumes', page.locator('.vol-pair'), { pad: 16 })
await hideBar(false)
await shot('player-bar', page.locator('.playerbar'))
await hideBar(true)
await shot('share-print', page.locator('.view-bar'), { pad: 10 })

await page.getByRole('button', { name: 'Full screen' }).click()
await page.locator('.perf-overlay .vf-line svg').first().waitFor()
await shot('perf-mode', page.locator('.perf-overlay'))
await page.keyboard.press('Escape')

// grid editor with the palette
await page.locator('.view-bar .seg-item', { hasText: 'Grid' }).click()
const seq = await page.locator('.seq').boundingBox()
await shot('grid-editor', page.locator('.seq'), { clip: { x: seq.x, y: seq.y, width: seq.width, height: Math.min(470, seq.height) } })
await page.getByRole('button', { name: 'Copy bar' }).first().click() // arm the clipboard
await shot('bar-strip', page.locator('.bar-strip'), { pad: 12 })
const bs = await page.locator('.bar-strip').boundingBox()
await page.screenshot({ path: `${TMP}/sections.png`, clip: { x: bs.x - 8, y: bs.y - 8, width: bs.width + 16, height: Math.min(170, bs.height) } })
shots.push('sections'); console.log('  • sections')

// goal chip (catalog exercise with seeded best+goal)
await goLib()
await page.locator('.lib2-search input').fill('Stick Control #1')
await page.locator('.exrow', { hasText: 'Stick Control #1' }).first().click()
await page.locator('.chip-goal').waitFor()
await shot('goal-chip', page.locator('.prac-meta'), { pad: 14 })

// tied roll notation (Stick Control 14.9)
await goLib()
await page.locator('.lib2-search input').fill('Short Rolls & Triplets 14.9')
await page.locator('.exrow').first().click()
await page.locator('.notation-wrap .vf-line svg').first().waitFor()
await shot('tied-roll', page.locator('.notation-wrap'))
await page.locator('.prac-back').click()
await page.locator('.lib2-search input').fill('Stick Control #1')
await page.locator('.exrow', { hasText: 'Stick Control #1' }).first().click()
await page.locator('.chip-goal').waitFor()

// sound sheet
await page.getByRole('button', { name: /Mixer & sounds/ }).click()
await page.locator('.sheet').waitFor()
await shot('sound-sheet', page.locator('.sheet'))
await page.keyboard.press('Escape').catch(() => {})
await page.locator('.sheet-close').click().catch(() => {})

// --- Workouts page ----------------------------------------------------------
await page.locator('.side-link', { hasText: 'Workouts' }).click()
await page.locator('.pr-panel').waitFor()
await shot('progress', page.locator('.pr-panel'))
await shot('setlist', page.locator('.sl-panel'))
await shot('surprise', page.locator('.surprise-card'), { pad: 10 })
await page.evaluate(() => window.scrollTo(0, 0))
const wk = await page.locator('.lib2-home').boundingBox()
await page.screenshot({ path: `${TMP}/workouts.png`, clip: { x: wk.x, y: Math.max(0, wk.y), width: wk.width, height: 620 } })
shots.push('workouts'); console.log('  • workouts')
await page.getByRole('button', { name: 'Stats' }).click()
await page.locator('.stats-sheet').waitFor()
await shot('stats', page.locator('.stats-sheet'))
await page.locator('.stats-sheet .sheet-close').click()
await shot('daily', page.locator('.daily-card'), { pad: 10 })
// runner strip: start a built-in workout
await page.locator('.wk-card', { hasText: 'Beginner Daily' }).click()
await hideBar(false)
await page.getByRole('button', { name: /Start/ }).first().click()
await page.locator('.pb-wkrow').waitFor()
await shot('runner', page.locator('.playerbar'))
await hideBar(true)

await browser.close()

// PNG -> WebP (Pillow), capped at 1400px wide.
execSync(`python3 - << 'EOF'
from PIL import Image
import os
src = '${TMP}'
out = '${OUT}'
for f in sorted(os.listdir(src)):
    if not f.endswith('.png'):
        continue
    im = Image.open(os.path.join(src, f)).convert('RGB')
    if im.width > 1400:
        im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(os.path.join(out, f.replace('.png', '.webp')), 'WEBP', quality=78)
print('converted', len([f for f in os.listdir(out) if f.endswith('.webp')]), 'images')
EOF`, { stdio: 'inherit' })

let total = 0
readdirSync(OUT).forEach((f) => { total += statSync(OUT + f).size })
console.log(`done: ${shots.length} shots, ${(total / 1024).toFixed(0)} KB total in public/guide/`)

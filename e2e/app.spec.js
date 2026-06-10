import { test, expect } from '@playwright/test'

// v2 UI is English-only with a sidebar + persistent player bar.
test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('metronome plays via the player bar and the playhead advances', async ({ page }) => {
  const play = page.locator('.pb-play')
  await expect(play).not.toHaveClass(/is-playing/)
  await play.click()
  await expect(play).toHaveClass(/is-playing/)
  await expect(page.locator('.metro-bigbeats .beat.is-active')).toHaveCount(1, { timeout: 3000 })
  await play.click()
  await expect(play).not.toHaveClass(/is-playing/)
})

test('spacebar toggles play/pause', async ({ page }) => {
  const play = page.locator('.pb-play')
  await page.locator('body').click()
  await page.keyboard.press('Space')
  await expect(play).toHaveClass(/is-playing/)
  await page.keyboard.press('Space')
  await expect(play).not.toHaveClass(/is-playing/)
})

test('changing time signature updates the big beat dots', async ({ page }) => {
  await expect(page.locator('.metro-bigbeats .beat')).toHaveCount(4)
  await page.locator('.metroview select.select').selectOption('3/4')
  await expect(page.locator('.metro-bigbeats .beat')).toHaveCount(3)
})

test('subdivision note picker updates selection', async ({ page }) => {
  const eighth = page.locator('.metroview .notepick button[aria-label="eighth"]')
  await eighth.click()
  await expect(eighth).toHaveClass(/is-active/)
})

test('theme toggle flips data-theme', async ({ page }) => {
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-theme', 'dark')
  await page.locator('.sidebar .iconbtn').first().click()
  await expect(html).toHaveAttribute('data-theme', 'light')
})

test('library lists technique categories and opens a catalog exercise (view-only)', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await expect(page.locator('.cat-card')).not.toHaveCount(0)

  await page.locator('.cat-card').first().click()
  const row = page.locator('.exrow').first()
  await expect(row).toBeVisible()
  await row.click()

  // Practice view, catalog item -> Notes view + Notes/Grid switch present
  await expect(page.locator('.practice')).toBeVisible()
  await expect(page.locator('.notation-wrap .vf-host svg')).toBeVisible()
  await expect(page.locator('.view-bar .seg')).toBeVisible()

  // Grid is read-only for catalog items
  await page.locator('.view-bar .seg-item', { hasText: 'Grid' }).click()
  await expect(page.locator('.seq .cell.ro').first()).toBeVisible()
})

test('plays a catalog exercise (player bar shows it)', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  await page.locator('.pb-play').click()
  await expect(page.locator('.pb-play')).toHaveClass(/is-playing/)
  await expect(page.locator('.pb-now .pb-title')).not.toHaveText('')
  await page.locator('.pb-play').click()
})

test('grid cell cycles through every state: hit, accent, ghost, flam, drag, roll, off', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  await expect(page.locator('.practice')).toBeVisible()

  const kickRow = page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Kick$/ }) })
  const cell = kickRow.locator('.cell').first()
  await expect(cell).not.toHaveClass(/\bon\b/)
  await cell.click()
  await expect(cell).toHaveClass(/\bon\b/)
  await cell.click()
  await expect(cell).toHaveClass(/\baccent\b/)
  await cell.click()
  await expect(cell).toHaveClass(/\bghost\b/)
  await cell.click()
  await expect(cell).toHaveClass(/\bflam\b/)
  await expect(cell).toHaveText('f')
  await cell.click()
  await expect(cell).toHaveClass(/\bflam\b/) // drag shares the flam styling…
  await expect(cell).toHaveText('d') // …but shows "d"
  await cell.click()
  await expect(cell).toHaveClass(/\broll\b/)
  await cell.click()
  await expect(cell).not.toHaveClass(/\bon\b/)
  await expect(cell).not.toHaveClass(/\broll\b/)
})

test('ruler beat button cycles one beat to a triplet (grid resizes)', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  const kickCells = page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Kick$/ }) }).locator('.cell')
  await expect(kickCells).toHaveCount(16) // 4/4 sixteenth
  // click beat 2's ruler button: sixteenth -> quarter -> eighth -> triplet
  const tick2 = page.locator('.tick-btn').nth(1)
  await tick2.click(); await tick2.click(); await tick2.click()
  await expect(kickCells).toHaveCount(15) // 4 + 3 + 4 + 4
})

test('triplets and rolls catalog exercises render notation', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.side-subitem', { hasText: 'Triplets' }).click()
  await page.locator('.exrow').first().click()
  await expect(page.locator('.notation-wrap .vf-host svg')).toBeVisible()
  await page.locator('.prac-back').click()
  await page.locator('.side-subitem', { hasText: 'Rolls' }).click()
  await page.locator('.exrow').first().click()
  await expect(page.locator('.notation-wrap .vf-host svg')).toBeVisible()
})

test('practice has exercise + metronome volume sliders', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  await expect(page.getByLabel('Exercise volume')).toBeVisible()
  await expect(page.getByLabel('Metronome volume')).toBeVisible()
})

test('save adds the exercise to Saved and persists across reload', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  await page.locator('.prac-name-input').fill('My v2 Beat')
  // add a hit
  await page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Kick$/ }) }).locator('.cell').first().click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  // visible in Saved
  await page.locator('.side-subitem', { hasText: 'Saved' }).click()
  await expect(page.locator('.exrow-name', { hasText: 'My v2 Beat' })).toBeVisible()

  // persists
  await page.reload()
  await page.locator('.side-parent-main').click()
  await page.locator('.side-subitem', { hasText: 'Saved' }).click()
  await expect(page.locator('.exrow-name', { hasText: 'My v2 Beat' })).toBeVisible()
})

test('export downloads a .drums.json file', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/ }).click(),
  ])
  expect(download.suggestedFilename()).toContain('.drums.json')
})

test('share link copies via fallback (no clipboard API) and the URL opens the exercise', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  // Kill the async clipboard API (as on insecure LAN hosts) so the hidden
  // textarea + execCommand fallback has to do the work; capture what it copies.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined })
    window.__copied = null
    document.execCommand = (cmd) => {
      if (cmd !== 'copy') return false
      window.__copied = document.activeElement?.value ?? null
      return true
    }
  })
  await page.locator('button:visible', { hasText: 'Share link' }).click()
  await expect(page.locator('button:visible', { hasText: 'Link copied' })).toBeVisible()
  const url = await page.evaluate(() => window.__copied)
  expect(url).toContain('#x=')
  // The copied link round-trips: opening it lands on the exercise.
  await page.goto(url)
  await expect(page.locator('.practice')).toBeVisible()
  await expect(page.locator('.notation-wrap svg').first()).toBeVisible()
})

test('print renders a hidden A4-width copy without reflowing the screen', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  await expect(page.locator('.notation-wrap .vf-line svg').first()).toBeVisible()
  const screenW = await page.evaluate(
    () => document.querySelector('.notation-wrap .notation-inner')?.style.width,
  )
  await page.evaluate(() => {
    window.__printW = null
    window.print = () => {
      window.__printW = {
        print: document.querySelector('.print-notation .notation-inner')?.style.width,
        screen: document.querySelector('.notation-wrap .notation-inner')?.style.width,
      }
    }
  })
  await page.locator('button:visible', { hasText: 'Print' }).click()
  // By the time print() fires, the print copy must be laid out at 660px…
  await expect.poll(() => page.evaluate(() => window.__printW)).not.toBeNull()
  const w = await page.evaluate(() => window.__printW)
  expect(w.print).toBe('660px')
  // …while the on-screen notation never changed.
  expect(w.screen).toBe(screenW)
  // The print copy unmounts afterwards.
  await expect(page.locator('.print-notation')).toHaveCount(0)
})

test('new exercise opens in grid; reopening a saved one opens in notes', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  await expect(page.locator('.seq')).toBeVisible() // fresh exercise -> grid editor
  await page.locator('.prac-name-input').fill('Reopen test')
  await page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Kick$/ }) }).locator('.cell').first().click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.locator('.side-subitem', { hasText: 'Saved' }).click()
  await page.locator('.exrow', { hasText: 'Reopen test' }).click()
  await expect(page.locator('.notation-wrap .vf-line svg').first()).toBeVisible() // saved -> notes
})

test('sound sheet: kit choice persists, mixer mute persists', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  await page.getByRole('button', { name: /Mixer & sounds/ }).click()
  await expect(page.locator('.sheet')).toBeVisible()

  // Pick the electronic kit and zero out the snare.
  await page.locator('.kit-chip', { hasText: 'Electronic' }).click()
  await expect(page.locator('.kit-chip', { hasText: 'Electronic' })).toHaveClass(/is-active/)
  await page.locator('.mixer-row', { has: page.locator('.mix-label', { hasText: /^Snare$/ }) })
    .locator('input[type="range"]').fill('0')
  await expect(page.locator('.mix-label', { hasText: /^Snare$/ })).toHaveClass(/is-muted/)

  // Reset appears once the mixer is dirty.
  await expect(page.locator('.sheet').getByRole('button', { name: 'Reset' })).toBeVisible()

  // Both settings survive a reload.
  await page.reload()
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  await page.getByRole('button', { name: /Mixer & sounds/ }).click()
  await expect(page.locator('.kit-chip', { hasText: 'Electronic' })).toHaveClass(/is-active/)
  await expect(page.locator('.mix-label', { hasText: /^Snare$/ })).toHaveClass(/is-muted/)

  // Reset restores every fader to 100%.
  await page.locator('.sheet').getByRole('button', { name: 'Reset' }).click()
  await expect(page.locator('.mix-label.is-muted')).toHaveCount(0)
})

test('navigating away from a playing exercise pauses it', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  await page.locator('.pb-play').click()
  await expect(page.locator('.pb-play')).toHaveClass(/is-playing/)
  // Go back to the library — playback must pause, the item stays in the bar.
  await page.locator('.prac-back').click()
  await expect(page.locator('.pb-play')).not.toHaveClass(/is-playing/)
  await expect(page.locator('.pb-now .pb-title')).not.toHaveText('')
})

test('player bar reopens the paused exercise; close clears it', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.locator('.cat-card').first().click()
  await page.locator('.exrow').first().click()
  const title = await page.locator('.pb-title').textContent()
  // Leave the exercise — the bar keeps it and the title becomes a button.
  await page.locator('.prac-back').click()
  await expect(page.locator('.practice')).toHaveCount(0)
  await page.locator('.pb-now-btn').click()
  await expect(page.locator('.practice')).toBeVisible()
  await expect(page.locator('.pb-title')).toHaveText(title)
  // Close from the bar: transport reverts to plain metronome.
  await page.locator('.pb-close').click()
  await expect(page.locator('.practice')).toHaveCount(0)
  await expect(page.locator('.pb-close')).toHaveCount(0)
  await expect(page.locator('.pb-title')).toContainText('/')
})

test('articulations: pedal row exists; cross-stick stamps only on snare', async ({ page }) => {
  await page.locator('.side-parent-main').click()
  await page.getByRole('button', { name: /New exercise/ }).click()
  // The new hi-hat pedal row is in the grid.
  await expect(page.locator('.seq-rowlabel', { hasText: /^Hi-hat pedal$/ })).toBeVisible()

  // Pick the cross-stick stamp: it paints on the snare…
  await page.locator('.stamp', { hasText: 'Cross-stick' }).click()
  const snareCell = page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Snare$/ }) }).locator('.cell').first()
  await snareCell.click()
  await expect(snareCell).toHaveClass(/\bart\b/)
  await expect(snareCell).toHaveText('×')

  // …but not on the kick.
  const kickCell = page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Kick$/ }) }).locator('.cell').first()
  await kickCell.click()
  await expect(kickCell).not.toHaveClass(/\bart\b/)

  // Bell lands on the ride and the notation still renders.
  await page.locator('.stamp', { hasText: 'Ride bell' }).click()
  const rideCell = page.locator('.seq-row').filter({ has: page.locator('.seq-rowlabel', { hasText: /^Ride$/ }) }).locator('.cell').nth(4)
  await rideCell.click()
  await expect(rideCell).toHaveText('▲')
  await page.locator('.view-bar .seg-item', { hasText: 'Notes' }).click()
  await expect(page.locator('.notation-wrap .vf-line svg').first()).toBeVisible()
})

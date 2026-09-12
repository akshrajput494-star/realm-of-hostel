/* =========================================================================
   ROH end-to-end smoke test — exercises the 16 flows from the spec.
   Run:  node tests/smoke.mjs   (expects the static server on :8080)
   ========================================================================= */
import { chromium, devices } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:8080'
const results = []
const consoleErrors = []
let failures = 0

function check(step, ok, detail = '') {
  results.push({ step, ok, detail })
  if (!ok) failures++
  console.log(`${ok ? '  ✔' : '  ✖'} ${step}${detail ? ` — ${detail}` : ''}`)
}

async function step(name, fn) {
  process.stdout.write(`\n▸ ${name}\n`)
  try { await fn() } catch (e) {
    check(name, false, `threw: ${e.message.split('\n')[0]}`)
  }
}

/* Chrome reports getBoundingClientRect() without the ancestor 3D transform for
   elements inside a preserve-3d subtree, so we locate room blocks the same way a
   human does: by hit-testing what is actually painted where. */
async function blockPoint(page, index = 0) {
  return page.evaluate((i) => {
    const vp = document.querySelector('.map-viewport')
    if (!vp) return null
    const r = vp.getBoundingClientRect()
    const target = document.querySelectorAll('.room-block')[i]
    if (!target) return null
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9
    for (let y = r.top; y < r.bottom; y += 3) {
      for (let x = r.left; x < r.right; x += 3) {
        const top = document.elementsFromPoint(x, y)[0]
        if (top === target || target.contains(top)) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x)
          minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        }
      }
    }
    return maxX < -1e8 ? null : { x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2), area: (maxX - minX) * (maxY - minY) }
  }, index)
}

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`))

/* 1 — Homepage ---------------------------------------------------------- */
await step('1. Homepage loads with hero, stats, features and footer', async () => {
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  check('hero heading present', await page.getByRole('heading', { name: /find your perfect hostel room/i }).isVisible())
  const statText = await page.locator('.stat-num').first().innerText()
  check('animated stats rendered', /\d/.test(statText), `first stat = ${statText.trim()}`)
  check('6 feature cards', await page.locator('.feature').count() >= 6)
  check('primary CTA "Explore Rooms"', await page.getByRole('link', { name: /explore rooms/i }).first().isVisible())
  check('secondary CTA "View Dashboard"', await page.getByRole('link', { name: /view dashboard/i }).first().isVisible())
  check('footer present', await page.locator('footer.footer').isVisible())
  check('privacy note present', await page.locator('.privacy-note').first().isVisible())
  check('isometric 3D visual rendered', await page.locator('.iso-scene').isVisible())
})

/* 2 — Navigate to Explore Rooms ---------------------------------------- */
await step('2. Navigate to Explore Rooms via the navbar', async () => {
  await page.getByRole('link', { name: 'Rooms', exact: true }).first().click()
  await page.waitForTimeout(900)
  check('URL is #/rooms', page.url().endsWith('#/rooms'))
  check('room cards visible', await page.locator('.room-card').count() > 10, `${await page.locator('.room-card').count()} cards`)
})

/* 3 — Search ------------------------------------------------------------ */
await step('3. Search for a room', async () => {
  await page.getByLabel('Search rooms').fill('ARV-201')
  await page.waitForTimeout(400)
  const cards = await page.locator('.room-card').count()
  check('search narrows results', cards >= 1 && cards < 10, `${cards} result(s)`)
  const first = await page.locator('.room-card').first().innerText()
  check('result matches query', /ARV-201/.test(first))
  await page.getByLabel('Search rooms').fill('')
  await page.waitForTimeout(300)
})

/* 4 — Filters ----------------------------------------------------------- */
await step('4. Apply AC/Non-AC and capacity filters', async () => {
  await page.getByRole('button', { name: /^AC$/ }).first().click()
  await page.waitForTimeout(300)
  const acCards = await page.locator('.room-card').count()
  const allAC = await page.locator('.room-card', { hasText: 'Non-AC' }).count()
  check('AC filter applied', allAC === 0, `${acCards} AC rooms, ${allAC} non-AC leaked`)

  await page.getByRole('button', { name: '3-Seater' }).first().click()
  await page.waitForTimeout(300)
  const combo = await page.locator('.room-card').count()
  check('AC + 3-seater filter applied', combo > 0 && combo <= acCards, `${combo} rooms`)

  const fee = page.locator('#fee-range')
  await fee.fill('7000')
  await page.waitForTimeout(300)
  check('price range filter applied', await page.locator('.room-card').count() <= combo)

  await page.getByRole('button', { name: /reset all filters/i }).first().click()
  await page.waitForTimeout(500)
  check('reset restores every room', (await page.locator('.room-card').count()) > 20, `${await page.locator('.room-card').count()} rooms`)
})

/* 5 + 6 — Room details & bed layout ------------------------------------ */
await step('5–6. Open room details and inspect bed availability', async () => {
  await page.locator('.room-card').first().getByRole('button', { name: /view details/i }).click()
  await page.waitForTimeout(500)
  const modal = page.getByRole('dialog')
  check('detail dialog opened', await modal.isVisible())
  const text = await modal.innerText()
  check('shows monthly + semester fee + deposit', /Monthly Fee/.test(text) && /Semester Fee/.test(text) && /Security Deposit/.test(text))
  check('shows AC/Non-AC & seater', /AC|Non-AC/.test(text) && /seater/.test(text))
  const beds = await modal.locator('.bed').count()
  check('individual beds listed with status', beds >= 3, `${beds} beds`)
  check('bed status badges present', (await modal.locator('.bed .badge').count()) >= 3)
  check('apply / shortlist / compare actions', (await modal.getByRole('button', { name: /apply for room/i }).count()) === 1)
})

/* 7 — Shortlist --------------------------------------------------------- */
await step('7. Shortlist a room (and verify state + toast)', async () => {
  const dialog = page.getByRole('dialog')
  const before = await page.locator('.compare-bar').count()
  await dialog.getByRole('button', { name: /shortlist room/i }).click()
  await page.waitForTimeout(700)
  check('toast notification shown', await page.locator('.toast').last().isVisible())
  const toastText = await page.locator('.toast').last().innerText()
  check('shortlist confirmed by toast', /shortlist/i.test(toastText), toastText.replace(/\n/g, ' '))
  check('compare bar not shown for shortlist alone', (await page.locator('.compare-bar').count()) === before)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

/* 8 — 3D map ------------------------------------------------------------ */
await step('8. Open the interactive 3D hostel map', async () => {
  await page.goto(`${BASE}/#/map`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check('isometric floor plan rendered', await page.locator('.map-viewport svg').first().isVisible())
  const blocks = page.locator('.iso-room')
  check('interactive room blocks', await blocks.count() >= 3, `${await blocks.count()} blocks`)
  check('status legend present', await page.locator('.map-legend').isVisible())

  await blocks.first().hover()
  await page.waitForTimeout(400)
  check('hover tooltip appears', await page.locator('.map-tooltip').isVisible())
  check('tooltip shows bed availability', /free/i.test(await page.locator('.map-tooltip').innerText()))

  const vbBefore = await page.locator('.map-viewport svg').first().getAttribute('viewBox')
  await page.locator('.map-ctrl').first().click()
  await page.waitForTimeout(400)
  const vbAfter = await page.locator('.map-viewport svg').first().getAttribute('viewBox')
  check('zoom control changes the camera', vbBefore !== vbAfter, `${vbBefore} → ${vbAfter}`)

  await page.getByRole('button', { name: /stacked view/i }).click()
  await page.waitForTimeout(900)
  const stacked = await page.locator('.map-viewport [role="button"]').count()
  check('stacked multi-floor view renders', stacked >= 12, `${stacked} room blocks across all floors`)

  await page.getByRole('button', { name: 'Ground', exact: true }).click()
  await page.waitForTimeout(700)
  await blocks.first().click()
  await page.waitForTimeout(700)
  check('clicking a room opens the detail panel', await page.getByRole('dialog').isVisible())
  const dlgText = await page.getByRole('dialog').innerText()
  check('detail panel shows bed-by-bed status', (await page.getByRole('dialog').locator('.bed').count()) >= 3)
  check('detail panel keeps occupant identity private', /Occupant withheld|Occupant identity is private|Open for allocation/i.test(dlgText))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // keyboard access to the plan
  await blocks.first().focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  check('room panel opens from the keyboard', await page.getByRole('dialog').isVisible())
  await page.keyboard.press('Escape')
})

/* 9 — Mess -------------------------------------------------------------- */
await step('9. View the mess menu and timings', async () => {
  await page.goto(`${BASE}/#/mess`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const body = await page.locator('main').innerText()
  check('today menu shown', /Today's menu/i.test(body))
  for (const meal of ['Breakfast', 'Lunch', 'Snacks', 'Dinner']) {
    check(`${meal} timing present`, body.includes(meal))
  }
  check('weekly menu tabs', (await page.getByRole('tab').count()) >= 7)
  check('holiday menu present', /Special & holiday menu/i.test(body))
  await page.getByRole('tab', { name: 'Wed' }).click()
  await page.waitForTimeout(300)
  check('switching day updates menu', /Wednesday|Chole/i.test(await page.locator('main').innerText()))

  await page.locator('.rating button').nth(3).click()
  await page.getByLabel(/Comments for the mess committee/i).fill('Great biryani today, please keep the counter open longer.')
  await page.getByRole('button', { name: /submit feedback/i }).click()
  await page.waitForTimeout(500)
  check('meal feedback submitted', /feedback submitted/i.test(await page.locator('.toast').last().innerText()))
})

/* 10 — Transport -------------------------------------------------------- */
await step('10. View transport schedules', async () => {
  await page.goto(`${BASE}/#/transport`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const body = await page.locator('main').innerText()
  check('next bus highlight', /Next available bus/i.test(body))
  check('routes listed with timings', (await page.locator('.card').count()) >= 5)
  await page.getByRole('button', { name: /view stops/i }).first().click()
  await page.waitForTimeout(400)
  check('route stops expand', /Pickup:/i.test(await page.locator('main').innerText()))
  check('timetable table present', await page.locator('table.data').first().isVisible())
  const seats = await page.getByRole('button', { name: /reserve a seat/i }).count()
  check('seat reservation available', seats > 0)
})

/* 11 — Complaints ------------------------------------------------------- */
await step('11. Submit a complaint and track its status', async () => {
  await page.goto(`${BASE}/#/complaints`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // validation first
  await page.getByRole('button', { name: /submit complaint/i }).click()
  await page.waitForTimeout(400)
  check('validation blocks empty submission', /at least/i.test(await page.locator('form').innerText()))

  await page.getByLabel('Category').selectOption('Wi-Fi')
  await page.getByLabel('Title').fill('Wi-Fi very slow in the evening')
  await page.getByLabel('Description').fill('Speed drops to under 1 Mbps between 20:00 and 23:00 every day this week.')
  await page.getByRole('button', { name: /^High$/ }).click()
  await page.getByLabel('Room number').fill('ARV-201')
  await page.getByRole('button', { name: /submit complaint/i }).click()
  await page.waitForTimeout(900)

  const body = await page.locator('main').innerText()
  check('complaint appears in history', /Wi-Fi very slow in the evening/.test(body))
  check('ticket number generated', /ROH-\d+/.test(body))
  check('timeline available', (await page.locator('.timeline').count()) > 0)

  // filter + status tracking
  await page.getByRole('tab', { name: /^Pending/ }).click()
  await page.waitForTimeout(400)
  check('status filter works', (await page.locator('article.card').count()) > 0)
  await page.getByRole('tab', { name: /^All/ }).click()
  await page.waitForTimeout(300)
})

/* 12 — Payments --------------------------------------------------------- */
await step('12. View payment information and run the demo payment', async () => {
  await page.goto(`${BASE}/#/payments`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const body = await page.locator('main').innerText()
  for (const label of ['Total hostel fee', 'Paid amount', 'Pending amount', 'Days to due date']) {
    check(`${label} card present`, new RegExp(label, 'i').test(body))
  }
  check('visitor sees a private-ledger prompt, not other students\u2019 records', /Personal payment records are private/i.test(body))
  check('pay action gated for signed-out visitors', await page.getByRole('button', { name: /sign in to pay/i }).isDisabled())

  // now sign in as the demo student and use the ledger
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Sign in as Student/i }).click()
  await page.waitForTimeout(900)
  await page.goto(`${BASE}/#/payments`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  check('payment history table', await page.locator('table.data').first().isVisible())
  await page.getByRole('button', { name: /^Pay Now$/ }).first().click()
  await page.waitForTimeout(500)
  const modal = page.getByRole('dialog')
  check('demo payment dialog opens', await modal.isVisible())
  await modal.getByRole('button', { name: /confirm payment/i }).click()
  await page.waitForTimeout(900)
  check('payment recorded with receipt', /Receipt/.test(await page.locator('main').innerText()))
  check('receipt row added to history', (await page.locator('table.data tbody tr').count()) >= 4, `${await page.locator('table.data tbody tr').count()} rows`)
})

/* 13 — Student dashboard ------------------------------------------------ */
await step('13. Log in as a student and open the student dashboard', async () => {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Sign in as Student/i }).click()
  await page.waitForTimeout(1200)
  check('redirected to student dashboard', page.url().includes('#/dashboard'), page.url())
  const body = await page.locator('main').innerText()
  for (const item of ['Student profile', 'Daily check-in', 'Next bus', "Today's mess menu", 'Payment summary', 'Permitted roommate information', 'Hostel notices', 'Emergency Contacts']) {
    check(`dashboard section: ${item}`, new RegExp(item, 'i').test(body))
  }
  check('bed allotted shown', /Bed allotted/i.test(body))
  check('current hostel shown', /Aryabhatta|Kalpana/.test(body))

  await page.getByRole('button', { name: /mark check-in/i }).click()
  await page.waitForTimeout(500)
  check('check-in recorded', /Checked in \d/.test(await page.locator('main').innerText()))

  await page.getByRole('button', { name: /My Room & Bed/i }).click()
  await page.waitForTimeout(500)
  check('bed layout in dashboard', (await page.locator('.bed').count()) >= 3)
})

/* 13b — Shortlist page + rooms sidebar links still work */
await step('13b. Sidebar navigation inside the dashboard', async () => {
  for (const label of ['Mess & Timings', 'Transport', 'My Complaints', 'Fees & Payments', 'Emergency Contacts']) {
    await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click()
    await page.waitForTimeout(250)
    check(`dashboard tab: ${label}`, (await page.locator('main').innerText()).length > 200)
  }
})

/* 14 — Admin dashboard -------------------------------------------------- */
await step('14. Open the admin console', async () => {
  await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  // student account should be blocked
  check('student blocked from admin console', /Administrator access required/i.test(await page.locator('main').innerText()))

  await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Sign in as Administrator/i }).click()
  await page.waitForTimeout(1400)
  await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const body = await page.locator('main').innerText()
  for (const kpi of ['Total hostels', 'Total rooms', 'Total beds', 'Occupancy', 'Pending applications', 'Pending complaints']) {
    check(`admin KPI: ${kpi}`, new RegExp(kpi, 'i').test(body))
  }
  check('donut chart rendered', (await page.locator('svg[role="img"]').count()) >= 3)
  check('12 management sections', (await page.getByRole('tab').count()) >= 12)

  for (const section of ['Buildings', 'Floors', 'Rooms', 'Beds', 'Students', 'Room Applications', 'Complaints', 'Mess Menus', 'Payments', 'Transport Schedules', 'Notices', 'Hostels']) {
    await page.getByRole('tab', { name: section, exact: true }).click()
    await page.waitForTimeout(220)
    const txt = await page.locator('main').innerText()
    check(`admin section renders: ${section}`, txt.length > 300)
  }

  await page.getByRole('tab', { name: 'Beds', exact: true }).click()
  await page.waitForTimeout(300)
  const blockBtn = page.getByRole('button', { name: /^Block$/ }).first()
  await blockBtn.click()
  await page.waitForTimeout(500)
  check('bed block action works', /Bed blocked/i.test(await page.locator('.toast').last().innerText()))
})

/* 15 — Privacy: no private student data for visitors -------------------- */
await step('15. Verify private student information is not publicly visible', async () => {
  const anon = await browser.newContext()
  const p = await anon.newPage()
  const leaked = []

  // #/login is excluded on purpose: it publishes the demo *account* list, which is
  // the documented way to try the roles — it is not resident data.
  for (const route of ['#/', '#/rooms', '#/rooms/ARV-201', '#/map', '#/mess', '#/transport', '#/complaints', '#/notices', '#/dashboard', '#/admin', '#/payments']) {
    await p.goto(`${BASE}/${route}`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(450)
    const html = await p.content()
    // names, roll numbers, phone numbers, courses must not appear anywhere public
    for (const [what, needle] of [['student roll number', '2K25-'], ['student email', '@student.roh.edu'], ['guardian phone', '+91 88'], ['personal phone', '+91 97']]) {
      if (html.includes(needle)) leaked.push(`${what} on ${route}`)
    }
    if (/Aarav Sharma|Diya Nair|Rohan Verma|Ishita Rao|Kabir Singh|Meera Joshi|Dev Patel/.test(html)) leaked.push(`student name on ${route}`)
  }

  check('no student name, roll no., email or phone leaked publicly', leaked.length === 0, leaked.slice(0, 4).join('; '))

  // Bed status must still be public
  await p.goto(`${BASE}/#/rooms`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(500)
  const cards = await p.locator('.room-card').first().innerText()
  check('bed availability still public', /available/i.test(cards))
  await p.locator('.room-card').first().getByRole('button', { name: /view details/i }).click()
  await p.waitForTimeout(600)
  const dlg = await p.getByRole('dialog').innerText()
  check('occupant identity withheld publicly', /Occupant withheld|Open for allocation/.test(dlg))
  check('privacy explanation shown', /Resident identities are hidden in visitor mode/i.test(dlg))

  await p.goto(`${BASE}/#/complaints`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(700)
  const desk = await p.locator('main').innerText()
  check('complaint desk masks the complainant publicly', /raised by Resident · Room/i.test(desk) && !/raised by Aarav/i.test(desk))
  await anon.close()
})

/* 16 — Responsive ------------------------------------------------------- */
await step('16. Responsive behaviour on mobile, tablet and desktop', async () => {
  const mobile = await browser.newContext({ ...devices['iPhone 13'] })
  const m = await mobile.newPage()
  await m.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await m.waitForTimeout(500)
  check('mobile: bottom navigation visible', await m.locator('.bottom-nav').isVisible())
  check('mobile: desktop links hidden', !(await m.locator('.nav-links').isVisible()))
  await m.getByRole('button', { name: /open navigation menu/i }).click()
  await m.waitForTimeout(400)
  check('mobile: hamburger drawer opens', await m.locator('.drawer.open').isVisible())
  check('mobile: drawer lists all modules', (await m.locator('.drawer .drawer-link').count()) >= 9)
  await m.locator('.drawer .modal-x').click()
  await m.waitForTimeout(300)

  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('mobile: no horizontal overflow on home', overflow <= 2, `${overflow}px`)

  await m.goto(`${BASE}/#/rooms`, { waitUntil: 'networkidle' })
  await m.waitForTimeout(700)
  const o2 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('mobile: no horizontal overflow on rooms', o2 <= 2, `${o2}px`)

  await m.goto(`${BASE}/#/map`, { waitUntil: 'networkidle' })
  await m.waitForTimeout(700)
  check('mobile: map viewport renders', await m.locator('.map-viewport').isVisible())
  const o3 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('mobile: no horizontal overflow on map', o3 <= 2, `${o3}px`)
  await mobile.close()

  const tablet = await browser.newContext({ viewport: { width: 834, height: 1112 } })
  const t = await tablet.newPage()
  await t.goto(`${BASE}/#/rooms`, { waitUntil: 'networkidle' })
  await t.waitForTimeout(600)
  const to = await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check('tablet: no horizontal overflow', to <= 2, `${to}px`)
  check('tablet: hamburger shown (links hidden)', !(await t.locator('.nav-links').isVisible()))
  await tablet.close()

  for (const w of [1280, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`desktop ${w}px: no horizontal overflow`, o <= 2, `${o}px`)
  }
  check('desktop: primary nav visible', await page.locator('.nav-links').isVisible())
})

/* Extra — broken links / console health -------------------------------- */
await step('Extra. Link integrity, 404 handling and console health', async () => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).map((a) => a.getAttribute('href')))
  const unique = [...new Set(hrefs)]
  const bad = []
  for (const h of unique) {
    if (!h || h === '#') { bad.push(h); continue }
    if (!/^#(\/($|[a-z0-9/-]*)(\?[^#]*)?|main|how-it-works)$/i.test(h)) bad.push(h)
  }
  check('all internal links are well-formed routes', bad.length === 0, bad.join(', '))

  await page.locator('.nav a[href="#main"]').first().click({ trial: true }).catch(() => {})
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' })
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  check('skip-to-content anchor does not break routing', !/Error 404/i.test(await page.locator('main').innerText()))

  await page.goto(`${BASE}/#/does-not-exist`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  check('unknown route shows a 404 page (no crash)', /Error 404/i.test(await page.locator('main').innerText()))

  const real = consoleErrors.filter((e) => !/favicon|Download the React DevTools/i.test(e))
  check('no console / runtime errors during the whole run', real.length === 0, real.slice(0, 3).join(' | '))
})

await browser.close()

const passed = results.filter((r) => r.ok).length
console.log(`\n${'='.repeat(72)}`)
console.log(`ROH smoke test: ${passed}/${results.length} checks passed, ${failures} failed`)
if (failures) {
  console.log('\nFailures:')
  results.filter((r) => !r.ok).forEach((r) => console.log(`  ✖ ${r.step}${r.detail ? ` — ${r.detail}` : ''}`))
}
console.log('='.repeat(72))
process.exit(failures ? 1 : 0)

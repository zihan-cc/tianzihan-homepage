const { chromium } = require('C:/Users/27140/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage()
    await page.goto('http://127.0.0.1:5173/#/home')
    await page.locator('#contact').waitFor()
    for (const width of [1366, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 })
      const r = await page.evaluate(() => {
        const rect = id => {
          const r = document.getElementById(id).getBoundingClientRect()
          return { x: r.x, y: r.y, height: r.height, bottom: r.bottom }
        }
        return { interests: rect('interests'), contact: rect('contact'), overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert.equal(r.overflow, false)
      if (width > 720) {
        assert.ok(Math.abs(r.interests.y - r.contact.y) < 1)
        assert.ok(r.contact.x > r.interests.x)
        assert.ok(Math.abs(r.interests.height - r.contact.height) < 1)
      } else assert.ok(r.contact.y >= r.interests.bottom)
      if ([1366, 375].includes(width)) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.screenshot({ path: path.join(os.tmpdir(), `home-layout-${width}.png`), fullPage: true })
      }
    }
    console.log('PASS: desktop side-by-side/equal-height cards, mobile single column, no overflow')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })

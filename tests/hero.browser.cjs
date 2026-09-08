// Run against a running preview with Playwright installed outside project deps:
// PLAYWRIGHT_MODULE=/path/to/playwright node tests/hero.browser.cjs http://127.0.0.1:5179
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
 try {
  for (const mobile of [false, true]) {
   const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
   const page = await context.newPage(); const errors = [];
   page.on('pageerror', e => errors.push(e.message));
   await page.goto(process.argv[2], { waitUntil: 'networkidle' });
   await page.waitForTimeout(1100);
   const state = () => page.evaluate(() => {
    const pick = s => { const e = document.querySelector(s), c = getComputedStyle(e), r = e.getBoundingClientRect(); return { transform: c.transform, translate: c.translate, opacity: c.opacity, mx: c.getPropertyValue('--mx'), x: r.x + r.width / 2, y: r.y + r.height / 2, width: r.width }; };
    return { y: scrollY, title: pick('.metallic-title'), copy: pick('.hero-copy'), drop: pick('.droplet'), plus: pick('.plus') };
   });
   const idle = await state(); await page.waitForTimeout(850); const idle2 = await state();
   assert.notEqual(idle.title.translate, idle2.title.translate, 'title must visibly float after entrance finishes');
   assert.notEqual(idle.drop.translate, idle2.drop.translate, 'droplet must float at idle');
   await page.mouse.move(idle.drop.x + 45, idle.drop.y); await page.waitForTimeout(500);
   assert.notEqual((await state()).drop.mx, '0px', 'nearby pointer must move droplet');
   if (mobile) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 720 }] });
    for (let y = 700; y >= 100; y -= 25) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] }); await page.waitForTimeout(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
   } else await page.mouse.wheel(0, 810);
   await page.waitForTimeout(1500); const lifted = await state();
   assert(lifted.y > 450, 'native touch/wheel scroll must advance');
   assert(lifted.drop.y < idle.drop.y - 120, 'sphere must visibly rise');
   assert(lifted.drop.width < idle.drop.width * 0.7, 'sphere must shrink into plus');
   assert(Number(lifted.copy.opacity) < 0.15, 'title must yield to upload CTA');
   assert(Number(lifted.plus.opacity) > 0.9, 'plus must appear');
   assert(Math.abs(lifted.plus.y - lifted.drop.y) < 3, 'plus must stay centered in moving sphere');
   const chooser = page.waitForEvent('filechooser'); await page.locator('.droplet').click(); await chooser;
   await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600);
   assert.equal((await state()).copy.opacity, '1', 'scroll must reverse title fade');
   await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(200);
   assert.equal(await page.locator('.hero-copy-motion').evaluate(e => getComputedStyle(e).transform), 'none', 'reduced motion must clear entrance transform residue');
   const reduced = await state(); await page.evaluate(() => window.scrollTo(0, 500)); await page.waitForTimeout(300); const reducedScroll = await state();
   assert.equal(reduced.title.translate, reducedScroll.title.translate);
   assert.equal(reduced.drop.transform, reducedScroll.drop.transform);
   assert.equal(reduced.copy.transform, reducedScroll.copy.transform);
   await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
   const resumed = await state(); await page.waitForTimeout(600); assert.notEqual(resumed.title.translate, (await state()).title.translate);
   assert.deepEqual(errors, []);
   console.log(JSON.stringify({ mobile, idle, lifted, reduced, pageErrors: errors, filePicker: true, reversible: true, liveReducedMotion: true }));
   await context.close();
  }
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

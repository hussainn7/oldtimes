import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
});
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForFunction(
  () => document.querySelector('canvas.world-3d')?.dataset.drawCalls,
);
await page.getByRole('button', { name: 'Begin journey' }).click();
await page.waitForTimeout(1300);
await page.keyboard.down('d');
await page.waitForTimeout(700);
await page.keyboard.up('d');
await page.keyboard.press('e');
await page.getByRole('dialog').waitFor();
await page.locator('.choices button').first().click();
await page.getByRole('button', { name: 'Continue expedition' }).click();
await page.locator('.timeline-strip button').nth(6).click();
await page.waitForTimeout(1400);
await page.screenshot({ path: '.qa-shots/3d-production-ocean.png' });
await page.locator('.timeline-strip button').nth(13).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: '.qa-shots/3d-production.png' });
console.log(
  'Production',
  await page.locator('canvas.world-3d').evaluate((el) => ({ ...el.dataset })),
);
// Starting without WebGL uses the legacy renderer and keeps interactions alive.
const fallback = await browser.newPage();
await fallback.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    return type === 'webgl2' ? null : original.call(this, type, ...args);
  };
});
await fallback.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await fallback
  .locator('.render-status')
  .filter({ hasText: 'Compatibility view' })
  .waitFor();
await fallback.getByRole('button', { name: 'Begin journey' }).click();
await fallback.waitForTimeout(1200);
await fallback.keyboard.down('d');
await fallback.waitForTimeout(500);
await fallback.keyboard.up('d');
assert.notEqual(await fallback.locator('.exploration b').innerText(), '0 m');
await fallback.keyboard.press('e');
await fallback.getByRole('dialog').waitFor();
console.log('Initial no-WebGL fallback movement and encounter passed');
assert.deepEqual(errors, []);
await browser.close();
console.log('Production console/runtime: clean');

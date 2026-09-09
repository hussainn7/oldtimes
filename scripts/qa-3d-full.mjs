import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { periods } from '../.test-build/data.js';
const browser = await chromium.launch({
  args: ['--enable-webgl', '--ignore-gpu-blocklist'],
});
const results = { eras: [], responsive: [], errors: [], checks: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
function watch(p) {
  p.on('pageerror', (e) => results.errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      results.errors.push(m.text());
  });
}
watch(page);
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Begin journey' }).click();
await page.waitForTimeout(1300);
const state = () =>
  page.locator('canvas.world-3d').evaluate((el) => ({ ...el.dataset }));
assert.equal((await state()).period, 'jurassic');
await page.keyboard.down('w');
await page.waitForTimeout(600);
await page.keyboard.up('w');
await page.waitForTimeout(200);
assert.ok(Number((await state()).z) < 2, 'W changes depth');
await page.keyboard.down('d');
await page.waitForTimeout(600);
await page.keyboard.up('d');
await page.waitForTimeout(200);
assert.ok(Number((await state()).x) > 690, 'D changes route position');
await page.keyboard.press('e');
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(300);
const frozen = await state();
await page.keyboard.down('d');
await page.waitForTimeout(400);
await page.keyboard.up('d');
assert.equal((await state()).x, frozen.x, 'Dialog pauses movement');
await page.locator('.choices button').first().click();
assert.ok(await page.locator('.consequences').isVisible());
await page.getByRole('button', { name: 'Continue expedition' }).click();
await page.getByRole('button', { name: 'Pause expedition' }).click();
await page.waitForTimeout(300);
const paused = await state();
await page.keyboard.down('d');
await page.waitForTimeout(400);
await page.keyboard.up('d');
assert.equal((await state()).x, paused.x);
await page.getByRole('button', { name: 'Resume', exact: true }).click();
results.checks.push(
  'WASD, encounter choices, stat consequences, pause and resume',
);
// Test actual camera gestures and automatic recenter.
const beforeCamera = await page.screenshot();
await page.mouse.move(750, 480);
await page.mouse.down();
await page.mouse.move(900, 510, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
assert.notDeepEqual(await page.screenshot(), beforeCamera);
await page.keyboard.press('r');
results.checks.push('Drag camera and recenter');
for (const [i, p] of periods.entries()) {
  await page.locator('.timeline-strip button').nth(i).click();
  await page.waitForFunction(
    (id) => document.querySelector('canvas.world-3d')?.dataset.period === id,
    p.id,
  );
  await page.waitForTimeout(1150);
  const data = await state();
  assert.equal(Number(data.species), p.species.length);
  assert.equal(Number(data.x), 650);
  assert.ok(Number(data.drawCalls) > 0);
  results.eras.push(data);
  if ([0, 6, 9, 10, 13, 14, 16, 18, 20, 27].includes(i))
    await page.screenshot({ path: `.qa-shots/3d-era-${p.id}.png` });
  console.log('checkpoint', p.id, data.drawCalls, data.geometries);
}
for (let i = 0; i < 5; i++) {
  await page
    .getByRole('combobox', { name: 'Starting region' })
    .selectOption(String(i));
  await page.waitForTimeout(350);
  assert.ok(Number((await state()).drawCalls) > 0);
}
results.checks.push('All five regions');
await page.getByRole('button', { name: /Journal/ }).click();
assert.match(await page.getByRole('dialog').innerText(), /28 of 28 worlds/);
assert.ok((await page.locator('.journal-entry').count()) > 0);
await page.keyboard.press('Escape');
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Begin journey' }).click();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Journal/ }).click();
assert.match(await page.getByRole('dialog').innerText(), /28 of 28 worlds/);
await page.keyboard.press('Escape');
results.checks.push('Journal and 28 discoveries persisted after reload');
for (const [width, height] of [
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 740],
  [844, 390],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false, `horizontal overflow at ${width}`);
  for (const name of [
    'Walk left',
    'Walk right',
    'Walk forward',
    'Walk backward',
  ]) {
    const control = page.getByRole('button', { name, exact: true });
    const rect = await control.boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width, name);
  }
  await page.screenshot({ path: `.qa-shots/3d-responsive-${width}.png` });
  results.responsive.push({ width, height, overflow });
}
await page.setViewportSize({ width: 390, height: 844 });
const forward = await page
  .getByRole('button', { name: 'Walk forward' })
  .boundingBox();
const z = Number((await state()).z);
await page.mouse.move(
  forward.x + forward.width / 2,
  forward.y + forward.height / 2,
);
await page.mouse.down();
await page.waitForTimeout(450);
await page.mouse.up();
await page.waitForTimeout(150);
assert.ok(
  Number((await state()).z) < z,
  'Touch-compatible hold advances depth',
);
results.checks.push('Touch controls and six responsive sizes');
// Same scene recreated repeatedly must release its GPU resources.
await page.setViewportSize({ width: 1440, height: 900 });
const memory = [];
for (let i = 0; i < 6; i++) {
  await page
    .locator('.timeline-strip button')
    .nth(i % 2 ? 13 : 20)
    .click();
  await page.waitForTimeout(1200);
  memory.push(Number((await state()).geometries));
}
assert.ok(
  Math.abs(memory[1] - memory[5]) < 5,
  `GPU geometry count grew: ${memory}`,
);
results.checks.push(`Era disposal geometry counts: ${memory}`);
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.locator('.timeline-strip button').nth(13).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: '.qa-shots/3d-reduced-motion.png' });
results.checks.push('Reduced motion');
// A lost context must offer the original functional renderer.
await page
  .locator('canvas.world-3d')
  .evaluate((el) =>
    el.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext(),
  );
await page
  .locator('.render-status')
  .filter({ hasText: 'Compatibility view' })
  .waitFor();
await page.waitForTimeout(400);
await page.keyboard.down('d');
await page.waitForTimeout(500);
await page.keyboard.up('d');
assert.ok(await page.locator('canvas.world').isVisible());
results.checks.push('WebGL context loss retains compatibility gameplay');
await browser.close();
writeFileSync('.qa-shots/3d-report.json', JSON.stringify(results, null, 2));
console.log(
  JSON.stringify({ checks: results.checks, errors: results.errors }, null, 2),
);
assert.deepEqual(results.errors, []);

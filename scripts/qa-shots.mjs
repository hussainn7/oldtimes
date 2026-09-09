import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('.qa-shots', { recursive: true });
const browser = await chromium.launch();
const sizes = [
  [1440, 900, 'desktop'],
  [1280, 800, 'laptop'],
  [1024, 768, 'tablet-l'],
  [768, 1024, 'tablet'],
  [390, 844, 'mobile'],
];
for (const [w, h, name] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[${name}] console.error:`, msg.text());
  });
  page.on('pageerror', (err) => console.log(`[${name}] pageerror:`, err.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `.qa-shots/${name}-landing.png`, fullPage: false });
  await page.getByRole('button', { name: /Begin journey/i }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `.qa-shots/${name}-play.png`, fullPage: false });
  // jump eras
  const meso = page.getByRole('button', { name: 'Mesozoic', exact: true });
  if (await meso.count()) await meso.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `.qa-shots/${name}-mesozoic.png`, fullPage: false });
  // journal
  const journal = page.getByRole('button', { name: /Journal|Field journal/i }).first();
  if (await journal.count()) {
    await journal.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.qa-shots/${name}-journal.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  // rapid timeline
  for (const era of ['Origins', 'Today', 'Cenozoic']) {
    const b = page.getByRole('button', { name: era, exact: true });
    if (await b.count()) {
      await b.click();
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `.qa-shots/${name}-rapid.png`, fullPage: false });
  await page.close();
  console.log('done', name);
}
await browser.close();
console.log('qa complete');

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('output');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

async function shoot(url, name) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // Wait for animations to settle and SWR to populate.
  await page.waitForTimeout(2000);
  const out = path.join(outDir, name);
  await page.screenshot({ path: out, fullPage: true });
  console.log(`wrote ${out}`);
  await page.close();
}

await shoot('http://localhost:5180/', 'design-screenshot-app.png');
await shoot('http://localhost:5180/positions', 'design-screenshot-positions.png');

await browser.close();

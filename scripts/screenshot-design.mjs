import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('output');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto('http://localhost:5180/design', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(outDir, 'design-options.png'), fullPage: true });
console.log('wrote design-options.png');
await browser.close();

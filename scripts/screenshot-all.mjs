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
const page = await ctx.newPage();

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(2500);

// 1. Full app page
await page.screenshot({
  path: path.join(outDir, 'design-screenshot-app.png'),
  fullPage: false,
});
console.log('wrote design-screenshot-app.png');

// 2. Cropped "How a loop opens" panel: the bordered Box wrapping the diagram
//    selected via the caption above the steps.
const caption = page.getByText('How a loop opens', { exact: true });
await caption.waitFor({ state: 'visible', timeout: 5000 });
// the bordered container is the immediate parent of the caption.
const container = caption.locator('..');
const box = await container.boundingBox();
if (box) {
  // scale-aware screenshot: playwright uses CSS pixels for clip; image is 2x.
  await page.screenshot({
    path: path.join(outDir, 'how-a-loop-opens.png'),
    clip: {
      x: Math.max(0, box.x - 4),
      y: Math.max(0, box.y - 4),
      width: box.width + 8,
      height: box.height + 8,
    },
  });
  console.log('wrote how-a-loop-opens.png');
} else {
  console.log('warning: could not locate the loop-opens container');
}

// 3. Positions page (the empty state with the LogoMark + "Open your first one")
await page.goto('http://localhost:5180/positions', { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, 'design-screenshot-positions.png'), fullPage: false });
console.log('wrote design-screenshot-positions.png');

await browser.close();

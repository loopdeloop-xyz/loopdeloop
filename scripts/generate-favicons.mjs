import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public');

const compactSvg = await fs.readFile(path.join(publicDir, 'favicon.svg'));
const markSvg = await fs.readFile(path.join(publicDir, 'logo-mark.svg'));

async function rasterize(svgBuf, outName, size, source = 'compact') {
  await sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 41, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, outName));
  console.log(`wrote ${outName} (${size}px, src=${source})`);
}

await rasterize(compactSvg, 'favicon-16.png', 16);
await rasterize(compactSvg, 'favicon-32.png', 32);
await rasterize(markSvg, 'favicon-192.png', 192, 'mark');
await rasterize(markSvg, 'favicon-512.png', 512, 'mark');
await rasterize(markSvg, 'apple-touch-icon.png', 180, 'mark');

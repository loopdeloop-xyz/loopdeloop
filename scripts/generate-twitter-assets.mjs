import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('output');
await fs.mkdir(outDir, { recursive: true });

const MIDNIGHT = '#0F1729';
const MIDNIGHT_LINE = '#1F2E48';
const CORAL = '#FF6B4A';
const AMBER = '#FFB84D';
const CREAM = '#F5F1E8';
const CREAM_MUTED = '#A8B0C0';

const LOGO_MARK = `
  <line x1="6" y1="44" x2="58" y2="44" stroke="${CORAL}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="28" cy="28" r="14" fill="none" stroke="${CORAL}" stroke-width="4"/>
  <path d="M58 44 L52 41 L54.5 44 L52 47 Z" fill="${AMBER}"/>
`;

// Profile picture: 400x400, LogoMark centered on midnight.
// Twitter circle-crops to ~360px diameter; we pad to 60px on each side so the
// trail and plane sit safely inside the circle.
const profileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="${MIDNIGHT}"/>
  <g transform="translate(60 60) scale(4.375)">${LOGO_MARK}</g>
</svg>`;

// Banner: 1500x500. Logotype is center-right so it clears the bottom-left
// profile-pic overlay (~200px circle, centered ~(200, 400)).
// Tagline below in coral caps. Horizon hairline near 75%.
const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500">
  <rect width="1500" height="500" fill="${MIDNIGHT}"/>
  <line x1="0" y1="375" x2="1500" y2="375" stroke="${MIDNIGHT_LINE}" stroke-width="1"/>

  <g transform="translate(420 195) scale(2.0)">${LOGO_MARK}</g>

  <text x="570" y="270"
        font-family="Inter, 'Helvetica Neue', Arial, sans-serif"
        font-size="120" font-weight="700"
        letter-spacing="-5"
        fill="${CREAM}">loopdeloop</text>

  <text x="570" y="320"
        font-family="Inter, 'Helvetica Neue', Arial, sans-serif"
        font-size="22" font-weight="500"
        letter-spacing="5"
        fill="${CORAL}">LEVERAGE, EXECUTED CLEANLY</text>

  <text x="1430" y="455"
        font-family="Inter, 'Helvetica Neue', Arial, sans-serif"
        font-size="16" font-weight="500"
        letter-spacing="3"
        fill="${CREAM_MUTED}"
        text-anchor="end">loopdeloop.xyz</text>
</svg>`;

await sharp(Buffer.from(profileSvg), { density: 384 })
  .resize(400, 400)
  .png()
  .toFile(path.join(outDir, 'twitter-pfp.png'));
console.log('wrote twitter-pfp.png (400x400)');

await sharp(Buffer.from(bannerSvg), { density: 192 })
  .resize(1500, 500)
  .png()
  .toFile(path.join(outDir, 'twitter-banner.png'));
console.log('wrote twitter-banner.png (1500x500)');

// Also generate a 2x version of the profile pic for high-DPI uploads
await sharp(Buffer.from(profileSvg), { density: 768 })
  .resize(800, 800)
  .png()
  .toFile(path.join(outDir, 'twitter-pfp@2x.png'));
console.log('wrote twitter-pfp@2x.png (800x800)');

#!/usr/bin/env node
/**
 * Compresses PNG/JPEG assets to reduce app size.
 * Usage: node scripts/optimize-images.mjs
 *
 * Palette quantisation is opt-in per file, because what it buys varies wildly:
 * it takes kaaba_icon.png down by three quarters, but the 1024px icons are
 * photographic artwork where it saves nothing and only risks banding. Measure
 * before adding `palette` to an entry.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets');

async function optimize() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.log('Run: npm install sharp --save-dev');
    process.exit(1);
  }

  const files = [
    { file: 'icon.png', maxSize: 1024 },
    { file: 'adaptive-icon.png', maxSize: 1024 },
    { file: 'splash-icon.png', maxSize: 1024 },
    { file: 'favicon.png', maxSize: 256 },
    { file: 'bg.png', maxSize: 1920, palette: true },
    { file: 'kaaba_icon.png', maxSize: 1024, palette: true },
    { file: 'quran_page_bg.jpg', maxSize: 1024 },
  ];

  for (const { file, maxSize, palette } of files) {
    const p = path.join(assetsDir, file);
    if (!fs.existsSync(p)) continue;

    const before = fs.statSync(p).size;
    const img = sharp(p);
    const meta = await img.metadata();
    const needsResize = (meta.width || 0) > maxSize || (meta.height || 0) > maxSize;

    const ext = path.extname(p).toLowerCase();
    let pipeline = sharp(p).resize(needsResize ? maxSize : null, null, { fit: 'inside', withoutEnlargement: true });
    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: 85 });
    } else if (palette) {
      // quality 90 keeps the gradients clean; the size win comes from the palette
      pipeline = pipeline.png({ palette: true, quality: 90, effort: 10 });
    } else {
      pipeline = pipeline.png({ quality: 85, compressionLevel: 9 });
    }
    await pipeline.toFile(p + '.tmp');

    fs.renameSync(p + '.tmp', p);
    const after = fs.statSync(p).size;
    const saved = ((before - after) / 1024).toFixed(1);
    console.log(`${file}: ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB (saved ${saved} KB)`);
  }
}

optimize().catch(console.error);

#!/usr/bin/env node
/**
 * Downloads all azan sounds from Cloudinary, trims to 30 seconds, saves to assets/sounds/.
 * Requires: ffmpeg installed (brew install ffmpeg)
 *
 * Usage: node scripts/fetch-and-trim-azans.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dqrmoafsy/video/upload';
const DEFAULT_VERSION = 'v1769845759';

const AZAN_SOUNDS = [
  { key: 'azan1', publicId: '168410_xsa053' },
  { key: 'azan2', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A2%D9%A3%D9%A1%D9%A9_ivrvst' },
  { key: 'azan3', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A2%D9%A7%D9%A2%D9%A3_xnpavn' },
  { key: 'azan4', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A1%D9%A9%D9%A2%D9%A1_nun99y' },
  { key: 'azan5', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A0%D9%A7%D9%A4%D9%A8_s6d7vp' },
  { key: 'azan6', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A1%D9%A3%D9%A0%D9%A0%D9%A0%D9%A1%D9%A5%D9%A2%D9%A5_mauoej' },
  { key: 'azan7', publicId: '7K_4c3jkRBo_hqs3la' },
  { key: 'azan8', publicId: 'lv_0_%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A2%D9%A0%D9%A1%D9%A2%D9%A0%D9%A5%D9%A0%D9%A3%D9%A5_iwbs6j', version: 'v1770133685' },
];

const DURATION_SEC = 30;
const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');
const tempDir = path.join(__dirname, '..', '.tmp-azan');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function trimToWav(inputPath, outputPath, durationSec) {
  const ffmpeg = ffmpegPath || 'ffmpeg';
  await execFileAsync(ffmpeg, [
    '-y',
    '-i', inputPath,
    '-t', String(durationSec),
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    outputPath,
  ]);
}

async function main() {
  await ensureDir(soundsDir);
  await ensureDir(tempDir);

  console.log('Downloading and trimming azan sounds to 30 seconds...\n');

  for (const sound of AZAN_SOUNDS) {
    const version = sound.version ?? DEFAULT_VERSION;
    const url = `${CLOUDINARY_BASE}/${version}/${sound.publicId}.mp3`;
    const tempMp3 = path.join(tempDir, `${sound.key}.mp3`);
    const outWav = path.join(soundsDir, `${sound.key}_notification.wav`);

    try {
      console.log(`  ${sound.key}: downloading...`);
      const buf = await download(url);
      fs.writeFileSync(tempMp3, buf);

      console.log(`  ${sound.key}: trimming to ${DURATION_SEC}s...`);
      await trimToWav(tempMp3, outWav, DURATION_SEC);

      fs.unlinkSync(tempMp3);
      const size = (fs.statSync(outWav).size / 1024).toFixed(1);
      console.log(`  ${sound.key}: done (${size} KB)\n`);
    } catch (e) {
      console.error(`  ${sound.key}: FAILED -`, e.message);
    }
  }

  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch {}

  console.log('Done. Files saved to assets/sounds/*_notification.wav');
  console.log('\nNext: Add these to app.json expo-notifications plugin (underscore for Android):');
  console.log('  "sounds": ["./assets/sounds/azan1_notification.wav", "./assets/sounds/azan2_notification.wav", ...]');
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * Find which prayer settings best match target times.
 * Usage: node scripts/match-prayer-times.mjs [lat] [lon] [date YYYY-MM-DD]
 *
 * Default: Säter, Sweden (60.35, 15.75), today
 * Target times (from user): Fajr 05:13, Shuruk 07:29, Dhuhr 12:17, Asr 14:17, Maghrib 16:55, Isha 18:55
 */

const TARGET = {
  Fajr: '05:13',
  Sunrise: '07:29',
  Dhuhr: '12:17',
  Asr: '14:17',
  Maghrib: '16:55',
  Isha: '18:55',
};

const METHODS = [
  { key: 'MWL', id: 3 },
  { key: 'Egypt', id: 5 },
  { key: 'UmmAlQura', id: 4 },
  { key: 'Karachi', id: 1 },
  { key: 'Diyanet', id: 13 },
];

const ASR = [
  { key: 'Shafi', school: 0 },
  { key: 'Hanafi', school: 1 },
];

const HIGH_LAT = [
  { key: 'MiddleOfNight', param: 1 },
  { key: 'SeventhOfNight', param: 2 },
  { key: 'AngleBased', param: 3 },
];

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function diffMinutes(a, b) {
  return Math.abs(timeToMinutes(a) - timeToMinutes(b));
}

async function fetchTimes(lat, lon, dateStr, methodId, school, latAdj) {
  const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lon}&method=${methodId}&school=${school}&latitudeAdjustmentMethod=${latAdj}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const t = data?.data?.timings;
  if (!t) throw new Error('No timings');
  return {
    Fajr: t.Fajr?.split(' ')[0],
    Sunrise: t.Sunrise?.split(' ')[0],
    Dhuhr: t.Dhuhr?.split(' ')[0],
    Asr: t.Asr?.split(' ')[0],
    Maghrib: t.Maghrib?.split(' ')[0],
    Isha: t.Isha?.split(' ')[0],
  };
}

function totalError(got) {
  let err = 0;
  for (const [name, target] of Object.entries(TARGET)) {
    if (got[name]) err += diffMinutes(target, got[name]);
  }
  return err;
}

async function main() {
  const lat = parseFloat(process.argv[2] ?? 60.35);
  const lon = parseFloat(process.argv[3] ?? 15.75);
  const dateStr = process.argv[4] ?? new Date().toISOString().slice(0, 10);

  console.log(`\nMatching target times for ${dateStr} at ${lat}, ${lon}:`);
  console.log(JSON.stringify(TARGET, null, 2));
  console.log('\nTesting all combinations...\n');

  const results = [];

  for (const method of METHODS) {
    for (const asr of ASR) {
      for (const hl of HIGH_LAT) {
        try {
          const got = await fetchTimes(lat, lon, dateStr, method.id, asr.school, hl.param);
          const err = totalError(got);
          results.push({
            method: method.key,
            asr: asr.key,
            highLat: hl.key,
            error: err,
            times: got,
          });
        } catch (e) {
          results.push({ method: method.key, asr: asr.key, highLat: hl.key, error: Infinity, errorMsg: e.message });
        }
      }
    }
  }

  results.sort((a, b) => a.error - b.error);

  // Also show Diyanet+Shafi+MiddleOfNight (current default) if not in top 5
  const defaultCombo = results.find((r) => r.method === 'Diyanet' && r.asr === 'Shafi' && r.highLat === 'MiddleOfNight');
  if (defaultCombo && !results.slice(0, 5).includes(defaultCombo)) {
    console.log('Current default (Diyanet + Shafi + MiddleOfNight):');
    console.log('  ', defaultCombo.times ? JSON.stringify(defaultCombo.times) : defaultCombo.errorMsg);
    console.log('  Error:', defaultCombo.error, 'min\n');
  }

  console.log('Top 5 best matches:\n');
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    if (r.error === Infinity) continue;
    console.log(`${i + 1}. ${r.method} + ${r.asr} + ${r.highLat} — total error: ${r.error} min`);
    console.log('   ', JSON.stringify(r.times));
    console.log('');
  }

  const best = results[0];
  if (best?.times) {
    console.log('--- Per-prayer offsets to reach target (minutes) ---');
    const offsets = {};
    for (const [name, target] of Object.entries(TARGET)) {
      if (best.times[name]) {
        const diff = timeToMinutes(target) - timeToMinutes(best.times[name]);
        offsets[name] = diff;
      }
    }
    console.log(JSON.stringify(offsets, null, 2));
  }
}

main().catch(console.error);

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const presets = readFileSync(join(root, 'src/features/prayer/constants/presets.ts'), 'utf8');
const methods = readFileSync(join(root, 'src/features/prayer/constants/methods.ts'), 'utf8');

function countryBlock(countryCode) {
  const marker = `  ${countryCode}: {`;
  const start = presets.indexOf(marker);
  assert.notEqual(start, -1, `Missing preset for ${countryCode}`);
  const rest = presets.slice(start + marker.length);
  const end = rest.indexOf('\n  },');
  assert.notEqual(end, -1, `Could not parse preset for ${countryCode}`);
  return rest.slice(0, end);
}

function assertBlockIncludes(countryCode, expected) {
  const block = countryBlock(countryCode);
  for (const [key, value] of Object.entries(expected)) {
    assert.match(block, new RegExp(`${key}: '${value}'`), `${countryCode} should set ${key}=${value}`);
  }
}

assertBlockIncludes('SE', { calculationMethod: 'Diyanet', highLatitudeRule: 'AngleBased' });
assertBlockIncludes('MA', { calculationMethod: 'Morocco' });
assertBlockIncludes('EG', { calculationMethod: 'Egypt' });
assertBlockIncludes('DZ', { calculationMethod: 'Algeria' });
assertBlockIncludes('SD', { calculationMethod: 'MWL' });

assert.match(methods, /Algeria:\s*19/, 'Algeria must map to AlAdhan method 19');
assert.match(methods, /Morocco:\s*21/, 'Morocco must map to AlAdhan method 21');

console.log('Prayer preset checks passed.');

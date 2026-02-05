/*
Simple i18n generator script.
Requires: npm install js-yaml

Usage:
  node scripts/generate_i18n.js

Reads: docs/config/i18n.yaml
Outputs: docs/config/locales/en.json and vi.json
*/

const fs = require('fs');
const path = require('path');
let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('Missing dependency: js-yaml. Run `npm install js-yaml` then re-run.');
  process.exit(1);
}

const src = path.join(__dirname, '..', 'docs', 'config', 'i18n.yaml');
const outDir = path.join(__dirname, '..', 'docs', 'config', 'locales');

if (!fs.existsSync(src)) {
  console.error('i18n.yaml not found at', src);
  process.exit(1);
}

const content = fs.readFileSync(src, 'utf8');
const doc = yaml.load(content);

// Strategy: walk `doc.translations` or top-level mappings. Support either structure.
let translations = doc.translations || doc;

// Flatten to per-locale objects
const locales = {};

function walk(node, keyPath = []) {
  if (typeof node === 'string') return node;
  if (typeof node !== 'object' || node === null) return node;

  const isLocaleLeaf = Object.keys(node).every(k => k.length === 2);
  if (isLocaleLeaf) {
    // node is like {vi: '...', en: '...'}
    Object.entries(node).forEach(([loc, val]) => {
      locales[loc] = locales[loc] || {};
      const target = locales[loc];
      // assign into nested structure
      let cur = target;
      for (let i = 0; i < keyPath.length - 1; i++) {
        const k = keyPath[i];
        cur[k] = cur[k] || {};
        cur = cur[k];
      }
      cur[keyPath[keyPath.length - 1]] = val;
    });
    return;
  }

  Object.entries(node).forEach(([k, v]) => {
    walk(v, [...keyPath, k]);
  });
}

walk(translations);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

Object.entries(locales).forEach(([loc, data]) => {
  const out = path.join(outDir, `${loc}.json`);
  fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf8');
  console.log('Wrote', out);
});

console.log('Done.');

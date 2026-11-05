// Plan morning-digest § 3/4. Saves one rig page as one self-contained HTML file (ADR 0001, 0003).
// Usage: tsx --env-file-if-exists=.env scripts/save-preview.ts [path] [out]
// Defaults: /digest/2026-10-28 -> var/preview/index.html (var/ is git-ignored; previews never go in the repo).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const path = process.argv[2] ?? '/digest/2026-10-28';
const out = process.argv[3] ?? 'var/preview/index.html';

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path} answered ${res.status}`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`saved ${path} -> ${out} (${html.length} chars, marker: ${process.env.LANE_MARKER?.trim() ? 'set' : 'no marker set'})`);

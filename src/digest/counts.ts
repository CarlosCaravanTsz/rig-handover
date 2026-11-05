// Plan morning-digest § 2c. Per-night line counts for the status board.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

/** Lines by status for one night. Bad lines are not counted. Null when there is no file. */
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) counts[l.status]++;
  }
  return counts;
}

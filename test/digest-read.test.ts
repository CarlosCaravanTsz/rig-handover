import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n).not.toBeNull();
    expect(n!.badLines).toBe(1);
    expect(n!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const byJob = Object.fromEntries(n!.rows.map((r) => [r.job, r]));
    expect(byJob['fixtures/refresh']).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['notes/backup']).toMatchObject({ runs: 1, lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
    expect(byJob['digest/render']!.owner).toBeNull();
    expect(byJob['lane/sync']).toMatchObject({ retries: 1, lastStatus: 'ok', firstAt: '2026-10-28T23:00:06+01:00' });
  });

  it('returns null for a night with no file or a bad night name', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('gives no rows for an empty file and counts wrong-shaped lines as bad', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-11-01.jsonl'), '');
    writeFileSync(join(dir, '2026-11-02.jsonl'), '{"at":"x","job":"j","status":"weird","owner":null}\n[]\n');
    expect(readNight(dir, '2026-11-01')).toEqual({ night: '2026-11-01', rows: [], badLines: 0 });
    expect(readNight(dir, '2026-11-02')).toEqual({ night: '2026-11-02', rows: [], badLines: 2 });
  });
});

describe('readNight fails', () => {
  it('counts a fail even when a later run passed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-11-03.jsonl'),
      '{"at":"2026-11-03T01:00:00+01:00","job":"j","status":"fail","owner":"o","error":"boom"}\n' +
        '{"at":"2026-11-03T02:00:00+01:00","job":"j","status":"ok","owner":"o"}\n',
    );
    expect(readNight(dir, '2026-11-03')!.rows[0]).toMatchObject({ fails: 1, lastStatus: 'ok', lastError: null });
  });
});

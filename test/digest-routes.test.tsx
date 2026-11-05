import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const NORMAL = '2026-11-04';
const EMPTY = '2026-11-05';
const BAD = '2026-11-03';
const MISSING = '2026-01-01';

const normalLines = [
  '{"at":"2026-11-04T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"lane-07"}',
  '{"at":"2026-11-04T01:10:00+01:00","job":"digest/render","status":"retry","owner":null}',
  '{"at":"2026-11-04T01:20:00+01:00","job":"digest/render","status":"ok","owner":null}',
];

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(runsDir, `${NORMAL}.jsonl`), normalLines.join('\n') + '\n');
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(join(runsDir, `${BAD}.jsonl`), ['not json at all', ...normalLines].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

/** Job names in the order the page's table lists them (first cell of each body row). */
function pageJobs(html: string): string[] {
  const body = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
  return [...body.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g)].map((m) => m[1]!);
}

describe('GET /digest/:night', () => {
  it('200 for a normal night, listing its jobs', async () => {
    const res = await app.request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`digest · ${NORMAL}`);
    expect(html).not.toContain('did not parse');
    expect(pageJobs(html)).toEqual(['digest/render', 'lane/sync']);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request(`/digest/${MISSING}`);
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain('no run log for that night');
  });

  it('shows "nothing ran" for the empty night', async () => {
    const res = await app.request(`/digest/${EMPTY}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(pageJobs(html)).toEqual([]);
  });

  it('stays 200 and counts the bad line', async () => {
    const res = await app.request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line did not parse');
    expect(pageJobs(html)).toEqual(['digest/render', 'lane/sync']);
  });
});

describe('GET /api/digest/:night', () => {
  it('200 for a normal night, rows sorted by job', async () => {
    const res = await app.request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe(NORMAL);
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['digest/render', 'lane/sync']);
  });

  it('404 for a night with no file', async () => {
    const res = await app.request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: `no run log for ${MISSING}` });
  });

  it('empty night gives rows []', async () => {
    const res = await app.request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0 });
  });

  it('bad-line night gives 200 and badLines 1', async () => {
    const res = await app.request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { badLines: number; rows: { job: string }[] };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['digest/render', 'lane/sync']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order for the normal night', async () => {
    const html = await (await app.request(`/digest/${NORMAL}`)).text();
    const json = (await (await app.request(`/api/digest/${NORMAL}`)).json()) as { rows: { job: string }[] };
    expect(pageJobs(html)).toEqual(json.rows.map((r) => r.job));
  });
});

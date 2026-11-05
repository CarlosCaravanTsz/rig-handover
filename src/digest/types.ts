// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One parsed line of runs/<night>.jsonl. */
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for the night. Times keep the offset from the log. */
export type DigestRow = {
  job: string;
  /** Owner on the job's last line; null when the log says null (views show `—`). */
  owner: string | null;
  /** Lines for this job, any status. */
  runs: number;
  /** Lines with status `retry`. */
  retries: number;
  /** Lines with status `fail`, so a fail is marked even when a later run passed. */
  fails: number;
  lastStatus: RunStatus;
  /** Error on the job's last line, or null. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  /** Sorted by job. The page and the JSON both use this order. */
  rows: DigestRow[];
  /** Lines that did not parse. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads runs/<night>.jsonl from `runsDir`.
 * Returns null when there is no file for that night (or `night` is not YYYY-MM-DD).
 * An empty file gives `rows: []`.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;

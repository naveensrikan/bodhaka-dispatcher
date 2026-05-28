import parser from 'cron-parser';
import { getDb } from '../db/database';
import { executeAgent } from './executor';

export interface MissedRun {
  agentId: string;
  agentName: string;
  schedule: string;
  missedCount: number;       // how many scheduled times were missed
  lastMissedAt: number;      // timestamp of the most recent missed slot
}

/**
 * Find agents whose scheduled time(s) passed while the app wasn't running.
 *
 * For each enabled, scheduled agent we look at its last successful run (or the
 * time it was created if never run) and count how many scheduled occurrences
 * happened between then and now.
 */
export function findMissedRuns(): MissedRun[] {
  const db = getDb();
  const agents = db.prepare(
    'SELECT id, name, schedule, created_at FROM agents WHERE enabled = 1 AND schedule IS NOT NULL'
  ).all() as any[];

  const missed: MissedRun[] = [];
  const now = new Date();

  for (const a of agents) {
    if (!a.schedule) continue;

    // Find the last time this agent actually ran (any status)
    const lastRun = db.prepare(
      'SELECT MAX(started_at) as t FROM agent_runs WHERE agent_id = ?'
    ).get(a.id) as { t: number | null };
    const since = new Date(lastRun?.t || a.created_at);

    try {
      const interval = parser.parseExpression(a.schedule, { currentDate: since, endDate: now });
      let count = 0;
      let lastSlot = 0;
      // Count scheduled occurrences strictly after `since` and up to now
      while (true) {
        try {
          const next = interval.next();
          const ts = next.getTime();
          if (ts > now.getTime()) break;
          count++;
          lastSlot = ts;
          if (count > 1000) break; // safety
        } catch {
          break; // no more occurrences in range
        }
      }
      if (count > 0) {
        missed.push({
          agentId: a.id,
          agentName: a.name,
          schedule: a.schedule,
          missedCount: count,
          lastMissedAt: lastSlot,
        });
      }
    } catch (err) {
      console.error(`[catchup] could not parse schedule for ${a.name}:`, err);
    }
  }

  return missed;
}

/**
 * Run missed agents according to the user's policy.
 * policy:
 *   'recent'  → run each missed agent once (most recent slot only)
 *   'all'     → run each missed agent once per missed slot (capped)
 *   'skip'    → do nothing
 */
export async function runMissed(missed: MissedRun[], policy: 'recent' | 'all' | 'skip'): Promise<number> {
  if (policy === 'skip') return 0;
  let ran = 0;
  for (const m of missed) {
    const times = policy === 'all' ? Math.min(m.missedCount, 5) : 1; // cap "all" at 5 to avoid floods
    for (let i = 0; i < times; i++) {
      try {
        await executeAgent(m.agentId);
        ran++;
      } catch (err) {
        console.error(`[catchup] failed to run ${m.agentName}:`, err);
      }
    }
  }
  return ran;
}

import cron from 'node-cron';
import { getDb } from '../db/database';
import { executeAgent } from './executor';

const scheduled = new Map<string, cron.ScheduledTask>();

export function startScheduler() {
  const db = getDb();
  const agents = db.prepare('SELECT id, schedule FROM agents WHERE enabled = 1 AND schedule IS NOT NULL').all() as any[];
  for (const a of agents) scheduleAgent(a.id, a.schedule);
  console.log(`[scheduler] started, ${scheduled.size} agents scheduled`);
}

export function scheduleAgent(agentId: string, cronExpression: string) {
  unscheduleAgent(agentId);
  if (!cron.validate(cronExpression)) {
    console.warn(`[scheduler] invalid cron for agent ${agentId}: ${cronExpression}`);
    return;
  }
  const task = cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] running ${agentId}`);
    try {
      await executeAgent(agentId);
    } catch (err) {
      console.error('[scheduler] failed:', err);
    }
  });
  scheduled.set(agentId, task);
}

export function unscheduleAgent(agentId: string) {
  const task = scheduled.get(agentId);
  if (task) {
    task.stop();
    scheduled.delete(agentId);
  }
}

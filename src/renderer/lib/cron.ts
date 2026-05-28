/**
 * Cron helpers: convert cron expressions to human-readable text, and provide
 * common presets + a structured builder model (minute/hour/day/month/weekday).
 */

export interface CronParts {
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
}

export const CRON_PRESETS: { label: string; value: string }[] = [
  { label: 'Every day at 7:00 AM', value: '0 7 * * *' },
  { label: 'Every day at 7:00 PM', value: '0 19 * * *' },
  { label: 'Every day at 9:00 AM', value: '0 9 * * *' },
  { label: 'Every weekday at 8:00 AM', value: '0 8 * * 1-5' },
  { label: 'Every Monday at 9:00 AM', value: '0 9 * * 1' },
  { label: 'Every Sunday at 8:00 PM', value: '0 20 * * 0' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'First day of every month at 9 AM', value: '0 9 1 * *' },
];

export function parseCron(expr: string): CronParts | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return { minute: parts[0], hour: parts[1], day: parts[2], month: parts[3], weekday: parts[4] };
}

export function buildCron(p: CronParts): string {
  return `${p.minute || '*'} ${p.hour || '*'} ${p.day || '*'} ${p.month || '*'} ${p.weekday || '*'}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(hour: string, minute: string): string {
  if (hour === '*' && minute === '*') return 'every minute';
  if (hour === '*') {
    if (minute.startsWith('*/')) return `every ${minute.slice(2)} minutes`;
    return `at minute ${minute} of every hour`;
  }
  const h = parseInt(hour);
  const m = minute === '*' ? 0 : parseInt(minute);
  if (isNaN(h)) return `at ${hour}:${minute}`;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `at ${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert a cron expression into a human-readable sentence.
 * e.g. "0 7 * * *" → "Every day at 7:00 AM"
 */
export function cronToHuman(expr: string): string {
  const p = parseCron(expr);
  if (!p) return expr || '(no schedule)';

  // Every N minutes
  if (p.minute.startsWith('*/') && p.hour === '*' && p.day === '*' && p.month === '*' && p.weekday === '*') {
    return `Every ${p.minute.slice(2)} minutes`;
  }
  if (p.minute === '0' && p.hour === '*' && p.day === '*' && p.month === '*' && p.weekday === '*') {
    return 'Every hour';
  }

  const time = formatTime(p.hour, p.minute);

  // Weekday-based
  if (p.weekday !== '*') {
    if (p.weekday === '1-5') return `Every weekday ${time}`;
    if (p.weekday === '0,6' || p.weekday === '6,0') return `Every weekend ${time}`;
    const days = p.weekday.split(',').map((d) => {
      if (d.includes('-')) {
        const [a, b] = d.split('-').map(Number);
        return `${WEEKDAYS[a]}–${WEEKDAYS[b]}`;
      }
      return WEEKDAYS[parseInt(d)] || d;
    });
    return `Every ${days.join(', ')} ${time}`;
  }

  // Day-of-month based
  if (p.day !== '*') {
    const monthPart = p.month !== '*' ? ` of ${MONTHS[parseInt(p.month)] || p.month}` : ' of every month';
    const dayNum = parseInt(p.day);
    const suffix = dayNum === 1 ? 'st' : dayNum === 2 ? 'nd' : dayNum === 3 ? 'rd' : 'th';
    return `On the ${p.day}${suffix}${monthPart} ${time}`;
  }

  // Daily
  return `Every day ${time}`;
}

// Options for dropdowns (Hostinger-style)
export const MINUTE_OPTIONS = [
  { label: 'Every minute', value: '*' },
  { label: '0', value: '0' }, { label: '15', value: '15' },
  { label: '30', value: '30' }, { label: '45', value: '45' },
  { label: 'Every 15 min', value: '*/15' }, { label: 'Every 30 min', value: '*/30' },
];

export const HOUR_OPTIONS = [
  { label: 'Every hour', value: '*' },
  ...Array.from({ length: 24 }, (_, h) => {
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { label: `${h12}:00 ${period}`, value: String(h) };
  }),
];

export const DAY_OPTIONS = [
  { label: 'Every day', value: '*' },
  ...Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
];

export const MONTH_OPTIONS = [
  { label: 'Every month', value: '*' },
  ...MONTHS.slice(1).map((m, i) => ({ label: m, value: String(i + 1) })),
];

export const WEEKDAY_OPTIONS = [
  { label: 'Every day', value: '*' },
  { label: 'Monday', value: '1' }, { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' }, { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' }, { label: 'Saturday', value: '6' },
  { label: 'Sunday', value: '0' },
  { label: 'Weekdays (Mon–Fri)', value: '1-5' },
  { label: 'Weekend (Sat–Sun)', value: '0,6' },
];

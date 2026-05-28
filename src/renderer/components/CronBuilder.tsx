import { useState, useEffect } from 'react';
import {
  parseCron, buildCron, cronToHuman, CRON_PRESETS,
  MINUTE_OPTIONS, HOUR_OPTIONS, DAY_OPTIONS, MONTH_OPTIONS, WEEKDAY_OPTIONS,
  type CronParts,
} from '../lib/cron';

interface CronBuilderProps {
  value: string;                       // current cron expression
  onChange: (cron: string) => void;
}

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [parts, setParts] = useState<CronParts>(
    parseCron(value) || { minute: '0', hour: '7', day: '*', month: '*', weekday: '*' }
  );
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  useEffect(() => {
    const p = parseCron(value);
    if (p) setParts(p);
  }, [value]);

  function updatePart(key: keyof CronParts, val: string) {
    const next = { ...parts, [key]: val };
    setParts(next);
    onChange(buildCron(next));
  }

  const matchedPreset = CRON_PRESETS.find((p) => p.value === value);

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 p-0.5 bg-bg-hover dark:bg-bg-dark-subtle rounded-win w-fit">
        <button
          onClick={() => setMode('preset')}
          className={`px-3 py-1 rounded text-[12px] transition-colors ${mode === 'preset' ? 'bg-bg-layer dark:bg-bg-dark-layer shadow-sm font-medium' : 'text-text-secondary'}`}
        >
          Common schedules
        </button>
        <button
          onClick={() => setMode('custom')}
          className={`px-3 py-1 rounded text-[12px] transition-colors ${mode === 'custom' ? 'bg-bg-layer dark:bg-bg-dark-layer shadow-sm font-medium' : 'text-text-secondary'}`}
        >
          Custom
        </button>
      </div>

      {mode === 'preset' ? (
        <select
          className="input w-full"
          value={matchedPreset?.value || ''}
          onChange={(e) => { onChange(e.target.value); }}
        >
          <option value="" disabled>Choose a schedule…</option>
          {CRON_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          <DropCol label="Minute" value={parts.minute} options={MINUTE_OPTIONS} onChange={(v) => updatePart('minute', v)} />
          <DropCol label="Hour" value={parts.hour} options={HOUR_OPTIONS} onChange={(v) => updatePart('hour', v)} />
          <DropCol label="Day" value={parts.day} options={DAY_OPTIONS} onChange={(v) => updatePart('day', v)} />
          <DropCol label="Month" value={parts.month} options={MONTH_OPTIONS} onChange={(v) => updatePart('month', v)} />
          <DropCol label="Weekday" value={parts.weekday} options={WEEKDAY_OPTIONS} onChange={(v) => updatePart('weekday', v)} />
        </div>
      )}

      {/* Human-readable preview */}
      <div className="flex items-center gap-2 p-2.5 rounded-win bg-brand-subtle dark:bg-brand-subtle-dark border border-brand/20">
        <span className="text-[12px] text-brand dark:text-brand-light font-medium">
          {value ? cronToHuman(value) : 'No schedule set — runs only when triggered manually'}
        </span>
        {value && (
          <span className="ml-auto text-[10px] font-mono text-text-tertiary">{value}</span>
        )}
      </div>
    </div>
  );
}

function DropCol({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { label: string; value: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-1">{label}</label>
      <select className="input w-full text-[12px] px-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

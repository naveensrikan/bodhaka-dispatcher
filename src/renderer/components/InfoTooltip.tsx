import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { ExtLink } from './ExtLink';

export interface SetupStep {
  step: number;
  text: string;
  link?: { label: string; href: string };
}

interface InfoTooltipProps {
  title: string;
  steps: SetupStep[];
}

export function InfoTooltip({ title, steps }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-text-tertiary hover:text-brand transition-colors p-0.5"
        aria-label="More info"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute z-50 top-6 left-0 w-96 card p-4 shadow-win-flyout">
          <div className="text-[13px] font-semibold mb-2 text-brand">{title}</div>
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.step} className="flex gap-2 text-[12px] text-text-secondary dark:text-text-secondary-dark leading-relaxed">
                <span className="font-semibold text-brand shrink-0">Step {s.step}:</span>
                <div>
                  {s.text}
                  {s.link && (
                    <>
                      {' '}
                      <ExtLink href={s.link.href} showIcon>{s.link.label}</ExtLink>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

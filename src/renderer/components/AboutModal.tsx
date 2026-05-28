import { X } from 'lucide-react';
import aboutLogo from '../assets/about-logo.png';

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md card p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-win text-text-tertiary hover:text-text-primary hover:bg-bg-hover dark:hover:bg-bg-dark-subtle"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <img src={aboutLogo} alt="Bodhaka" className="w-24 h-24 mx-auto mb-5" />

        <h2 className="text-xl font-semibold tracking-tight mb-1">Bodhaka Forge</h2>
        <p className="text-[12px] text-text-tertiary mb-5">Part of the Bodhaka product series</p>

        <div className="text-[13px] text-text-secondary dark:text-text-secondary-dark leading-relaxed space-y-3 text-left">
          <p>
            Bodhaka is a series of products built by an education-focused company with one aim: to bring
            AI and its everyday use within reach of every student.
          </p>
          <p>
            Bodhaka Forge lets students build their own AI study agents, so the technology becomes a
            practical, personal learning companion rather than something distant.
          </p>
          <p>
            We are <strong>BuoyantWave Learning Technologies LLP</strong>, based in Bangalore, India.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border dark:border-border-dark">
          <p className="text-[11px] text-text-tertiary mb-0.5">Our website</p>
          <p className="text-[13px] text-text-primary dark:text-text-primary-dark font-medium select-all">
            https://bodhaka.org
          </p>
        </div>
      </div>
    </div>
  );
}

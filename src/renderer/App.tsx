import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Library, Bot, Sparkles, History, Sun, Moon, HelpCircle, MessageCircle, DollarSign, Info, Download,
} from 'lucide-react';
import { cn } from './lib/cn';
import { Onboarding } from './components/Onboarding';
import { Disclaimer } from './components/Disclaimer';
import { MissedRunsBanner } from './components/MissedRunsBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { AboutModal } from './components/AboutModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logo } from './components/Logo';
import { ExtLink } from './components/ExtLink';

const navItems = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents',             icon: Bot,             label: 'My Agents' },
  { to: '/templates',          icon: Sparkles,        label: 'Agent Templates' },
  { to: '/knowledge',          icon: Library,         label: 'Knowledge Base' },
  { to: '/whatsapp-templates', icon: MessageCircle,   label: 'WhatsApp Templates' },
  { to: '/pricing',            icon: DollarSign,      label: 'Model Pricing' },
  { to: '/history',            icon: History,         label: 'Run History' },
  { to: '/configuration',      icon: Settings,        label: 'Settings' },
];

export function App() {
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [accepted, setAccepted] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    window.api.config.get().then((c) => {
      const t = c.ui?.theme || 'light';
      setTheme(t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    });
  }, []);

  async function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    const current = await window.api.config.get();
    await window.api.config.update({ ui: { ...current.ui, theme: next } });
  }

  const pageTitle = navItems.find((n) => location.pathname.startsWith(n.to))?.label || 'Dashboard';

  // Block the entire app until disclaimer is accepted
  if (!accepted) return <Disclaimer onAccepted={() => setAccepted(true)} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Onboarding />

      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border dark:border-border-dark bg-bg-base dark:bg-bg-dark flex flex-col">
        <div className="titlebar gap-2.5">
          <Logo size={26} />
          <div className="leading-none no-drag flex flex-col">
            <span className="text-[13px] font-semibold tracking-tight">Bodhaka Forge</span>
            <span className="text-[9px] text-text-tertiary mt-0.5 uppercase tracking-widest">Build AI Agents</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 no-drag">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-win text-[13px] transition-colors',
                  isActive
                    ? 'bg-brand-subtle dark:bg-brand-subtle-dark text-brand dark:text-brand-light font-medium'
                    : 'text-text-primary dark:text-text-primary-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle'
                )
              }
            >
              <item.icon size={15} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="pt-3 mt-3 border-t border-border dark:border-border-dark">
            <button
              onClick={() => window.api.shell.openExternal('https://bodhaka.org/bodhaka-forge')}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-win text-[13px] text-text-primary dark:text-text-primary-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle transition-colors"
            >
              <HelpCircle size={15} strokeWidth={1.75} />
              <span>Help & Docs</span>
            </button>
            <button
              onClick={() => setShowAbout(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-win text-[13px] text-text-primary dark:text-text-primary-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle transition-colors"
            >
              <Info size={15} strokeWidth={1.75} />
              <span>About</span>
            </button>
            <button
              onClick={async () => {
                const channel = await window.api.shell.updateChannel();
                if (channel === 'store') {
                  alert('Updates for this version are delivered automatically through the Microsoft Store. You do not need to check manually. Open the Microsoft Store and check "Library" to see or trigger updates.');
                  return;
                }
                if (channel === 'dev') {
                  alert('Update checking is only available in the installed app.');
                  return;
                }
                const r = await window.api.update.check();
                if (r.ok && !r.version) alert('You are on the latest version.');
                else if (!r.ok) alert('Could not check for updates right now. Please try again later.');
                // if r.version exists, the update banner will appear automatically
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-win text-[13px] text-text-primary dark:text-text-primary-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle transition-colors"
            >
              <Download size={15} strokeWidth={1.75} />
              <span>Check for updates</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border dark:border-border-dark no-drag space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-tertiary font-mono">v1.0.9</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-win hover:bg-bg-hover dark:hover:bg-bg-dark-subtle text-text-secondary"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>
          <ExtLink href="https://bodhaka.org" className="text-[10px] block leading-snug">
            Product of BuoyantWave Learning Technologies LLP
          </ExtLink>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col bg-bg-base dark:bg-bg-dark">
        <div className="titlebar justify-between">
          <span className="text-[13px] font-medium text-text-primary dark:text-text-primary-dark">{pageTitle}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <UpdateBanner />
          <MissedRunsBanner />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Settings, Library, Bot, Sparkles, History, Sun, Moon, Zap,
} from 'lucide-react';
import { cn } from './lib/cn';
import { Onboarding } from './components/Onboarding';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents',       icon: Bot,             label: 'My Agents' },
  { to: '/templates',    icon: Sparkles,        label: 'Templates' },
  { to: '/knowledge',    icon: Library,         label: 'Knowledge Base' },
  { to: '/history',      icon: History,         label: 'Run History' },
  { to: '/configuration', icon: Settings,       label: 'Settings' },
];

export function App() {
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Onboarding />

      <aside className="w-56 shrink-0 border-r border-border dark:border-border-dark bg-bg-base dark:bg-bg-dark flex flex-col">
        <div className="titlebar gap-2">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center no-drag">
            <Zap size={12} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[13px] font-semibold no-drag">Agent Studio</span>
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
                    ? 'bg-accent-subtle dark:bg-accent-subtle-dark text-accent font-medium'
                    : 'text-text-primary dark:text-text-primary-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle'
                )
              }
            >
              <item.icon size={15} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-2 border-t border-border dark:border-border-dark flex items-center justify-between no-drag">
          <span className="text-[11px] text-text-tertiary">v0.3.0</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-win hover:bg-bg-hover dark:hover:bg-bg-dark-subtle text-text-secondary" title="Toggle theme">
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col bg-bg-base dark:bg-bg-dark">
        <div className="titlebar justify-between">
          <span className="text-[13px] font-medium text-text-primary dark:text-text-primary-dark">{pageTitle}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

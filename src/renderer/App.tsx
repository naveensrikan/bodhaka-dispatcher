import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Library, Workflow, Bot, Sparkles } from 'lucide-react';
import { cn } from './lib/cn';
import './types/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/configuration', icon: Settings, label: 'Configuration' },
  { to: '/knowledge', icon: Library, label: 'Knowledge Base' },
  { to: '/agents', icon: Bot, label: 'My Agents' },
];

export function App() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-ink-700/50 bg-ink-900/40 backdrop-blur-md flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-ink-700/50 [-webkit-app-region:drag]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
            <Sparkles size={14} className="text-ink-900" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-base font-semibold tracking-tight">Agent</span>
            <span className="font-mono text-[10px] text-ink-300 -mt-0.5">studio</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 [-webkit-app-region:no-drag]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-ink-700/60 text-ink-50'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700/30'
                )
              }
            >
              <item.icon size={16} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-ink-700/50">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-mono">
            v0.1.0 · local
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="h-14 border-b border-ink-700/50 [-webkit-app-region:drag] flex items-center px-6">
          <span className="font-display text-sm text-ink-200 tracking-wide">
            {location.pathname.split('/')[1]?.replace(/-/g, ' ') || 'dashboard'}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

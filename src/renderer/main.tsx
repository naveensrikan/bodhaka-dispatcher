import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { Dashboard } from './pages/Dashboard';
import { Configuration } from './pages/Configuration';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { AgentBuilder } from './pages/AgentBuilder';
import { MyAgents } from './pages/MyAgents';
import { Templates } from './pages/Templates';
import { RunHistory } from './pages/RunHistory';
import { ToastProvider } from './components/Toast';
import './styles/globals.css';

// Load KaTeX's mhchem extension for chemistry notation (\ce{H2O})
// @ts-ignore — no type defs for this file
import 'katex/contrib/mhchem';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="agents" element={<MyAgents />} />
            <Route path="agents/new" element={<AgentBuilder />} />
            <Route path="agents/:id" element={<AgentBuilder />} />
            <Route path="templates" element={<Templates />} />
            <Route path="history" element={<RunHistory />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  </React.StrictMode>
);

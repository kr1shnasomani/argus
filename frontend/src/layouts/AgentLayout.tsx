import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, LayoutDashboard, Activity, Terminal, Sun, Moon, ChevronRight, Home, Sparkles, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import argusLogo from '@/assets/argus-logo.png';

// Theme toggle hook
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('argus-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('argus-theme', 'light');
    }
  };

  return { isDark, toggle };
};

export const AgentLayout = () => {
  const location = useLocation();
  const { isDark, toggle } = useTheme();

  const navItems = [
    { name: 'Escalated Queue', path: '/agent', icon: Layers, desc: 'Pending review', count: null },
    { name: 'Metrics', path: '/agent/metrics', icon: LayoutDashboard, desc: 'System telemetry', count: null },
    { name: 'Simulator', path: '/agent/simulator', icon: Terminal, desc: 'What-if engine', count: null },
    { name: 'Audit Log', path: '/agent/audit', icon: Activity, desc: 'Hash chain', count: null },
  ];

  const pageTitle = navItems.find(item => 
    location.pathname === item.path || 
    (location.pathname.startsWith('/agent/ticket') && item.path === '/agent')
  )?.name || 'Agent Portal';

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--argus-bg)' }}>
      
      {/* ── Sidebar ── */}
      <aside 
        className="w-[250px] flex flex-col flex-shrink-0 border-r"
        style={{ 
          background: 'var(--sidebar-bg)', 
          borderColor: 'var(--sidebar-border)' 
        }}
      >
        {/* Logo header */}
        <div 
          className="h-[60px] flex items-center px-5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className="flex items-center gap-3">
            <img
              src={argusLogo}
              alt="Argus logo"
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border"
              style={{ borderColor: 'var(--argus-border)' }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span 
                  className="font-bold text-[15px] tracking-tight"
                  style={{ color: 'var(--argus-text-primary)', fontFamily: 'DM Sans' }}
                >
                  ARGUS
                </span>
                <span 
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(124,58,237,0.15))',
                    color: 'var(--argus-indigo)',
                    border: '1px solid rgba(79,70,229,0.2)'
                  }}
                >
                  Agent
                </span>
              </div>
              <div 
                className="text-[10px] font-medium leading-none mt-0.5"
                style={{ color: 'var(--argus-text-muted)' }}
              >
                Neural Engine v1.0
              </div>
            </div>
          </div>
        </div>

        {/* System status strip */}
        <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--argus-emerald-light)' }}
          >
            <div className="relative">
              <span className="status-dot online flex-shrink-0" />
              <span className="live-indicator absolute inset-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--argus-emerald)' }}>
                All Systems Operational
              </div>
              <div className="text-[10px]" style={{ color: 'var(--argus-text-muted)' }}>
                Pipeline • Sandbox • Vector DB
              </div>
            </div>
            <Radio size={12} style={{ color: 'var(--argus-emerald)' }} className="flex-shrink-0 opacity-60" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          <div 
            className="text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 pt-1"
            style={{ color: 'var(--argus-text-muted)' }}
          >
                    background: isActive ? 'var(--argus-indigo-light)' : 'transparent',
                    color: isActive ? 'var(--argus-indigo)' : 'var(--sidebar-text)'
                  }}
                >
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px]">{item.name}</span>
                  <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--argus-text-muted)', opacity: isActive ? 1 : 0.7 }}>
                    {item.desc}
                  </div>
                </div>
                {isActive && (
                  <ChevronRight size={12} className="flex-shrink-0" style={{ color: 'var(--argus-indigo)', opacity: 0.6 }} />
                )}
              </Link> 
            <Link to="/agent/history" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${location.pathname === "/agent/history" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"}`}> 
              <Archive className="h-4 w-4" /> 
              All Tickets 
            </Link>
            );
          })}

          {/* Switch section */}
          <div className="pt-4">
            <div 
              className="text-[10px] font-semibold uppercase tracking-widest px-3 pb-2"
              style={{ color: 'var(--argus-text-muted)' }}
            >
              Switch Portal
            </div>
            <Link
              to="/employee"
              className="sidebar-link opacity-70 hover:opacity-100 group"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{ color: 'var(--sidebar-text)' }}>
                <Sparkles size={15} />
              </div>
              <span className="text-[13px]">Employee View</span>
            </Link> 
            <Link to="/agent/history" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${location.pathname === "/agent/history" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"}`}> 
              <Archive className="h-4 w-4" /> 
              All Tickets 
            </Link>
            <Link
              to="/"
              className="sidebar-link opacity-70 hover:opacity-100 group"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{ color: 'var(--sidebar-text)' }}>
                <Home size={15} />
              </div>
              <span className="text-[13px]">Back to Home</span>
            </Link> 
            <Link to="/agent/history" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${location.pathname === "/agent/history" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"}`}> 
              <Archive className="h-4 w-4" /> 
              All Tickets 
            </Link>
          </div>
        </nav>

        {/* Bottom section */}
        <div 
          className="p-3 border-t space-y-2"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{ 
              background: 'var(--sidebar-hover-bg)', 
              color: 'var(--sidebar-text)',
              border: '1px solid var(--argus-border)',
            }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
            <span className="text-xs">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Agent chip */}
          <div 
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ background: 'var(--argus-surface-2)' }}
          >
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              AG
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Agent Console</div>
              <div className="text-[10px]" style={{ color: 'var(--argus-text-muted)' }}>Superuser access</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <header 
          className="h-[52px] flex items-center px-6 border-b flex-shrink-0 gap-4 glass-panel"
          style={{ 
            borderColor: 'var(--argus-border)',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link to="/agent" className="transition-colors hover:opacity-80" style={{ color: 'var(--argus-text-muted)' }}>
              Agent Portal
            </Link> 
            <Link to="/agent/history" className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${location.pathname === "/agent/history" ? "bg-muted text-primary" : "text-muted-foreground hover:text-primary"}`}> 
              <Archive className="h-4 w-4" /> 
              All Tickets 
            </Link>
            <ChevronRight size={13} style={{ color: 'var(--argus-text-muted)', opacity: 0.5 }} />
            <span className="font-semibold" style={{ color: 'var(--argus-text-primary)' }}>{pageTitle}</span>
          </div>

          <div className="flex-1" />

          {/* Live status badge */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border"
            style={{ 
              background: 'var(--argus-emerald-light)',
              color: 'var(--argus-emerald)',
              borderColor: 'rgba(5, 150, 105, 0.2)'
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--argus-emerald)' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--argus-emerald)' }} />
            </span>
            Live
          </div>
        </header>

        {/* Page Content */}
        <main 
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--argus-bg)' }}
        >
          <div className="p-6 lg:p-8 max-w-[1400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, LayoutDashboard, Terminal, ChevronRight, Home, Sparkles, Radio, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import argusLogo from '@/assets/argus-logo.png';

export const AgentLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Escalated Queue', path: '/agent', icon: Layers, desc: 'Pending review', count: null },
    { name: 'All Tickets', path: '/agent/history', icon: Archive, desc: 'Ticket history', count: null },
    { name: 'Metrics', path: '/agent/metrics', icon: LayoutDashboard, desc: 'System telemetry', count: null },
    { name: 'Simulator', path: '/agent/simulator', icon: Terminal, desc: 'What-if engine', count: null },
  ];

  const activePathFallback = location.state?.from || '/agent';

  const pageTitle = navItems.find(item => 
    location.pathname === item.path || 
    (location.pathname.startsWith('/agent/ticket') && item.path === activePathFallback)
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
                  style={{ color: 'var(--argus-text-primary)' }}
                >
                  ARGUS
                </span>
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
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--argus-emerald)', flexShrink: 0 }} />
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
            Agent Tools
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (location.pathname.startsWith('/agent/ticket') && item.path === activePathFallback);

            return (
              <Link
                key={item.name}
                to={item.path}
                className="sidebar-link group"
                style={{ 
                  background: isActive ? 'var(--argus-indigo-light)' : 'transparent',
                  color: isActive ? 'var(--argus-indigo)' : 'var(--sidebar-text)'
                }}
              >
                <div 
                  className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
                  style={{ 
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
            <Link
              to="/"
              className="sidebar-link opacity-70 hover:opacity-100 group"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0" style={{ color: 'var(--sidebar-text)' }}>
                <Home size={15} />
              </div>
              <span className="text-[13px]">Back to Home</span>
            </Link>
          </div>
        </nav>

        {/* Bottom section */}
        <div 
          className="p-3 border-t space-y-2"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
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
            <ChevronRight size={13} style={{ color: 'var(--argus-text-muted)', opacity: 0.5 }} />
            <span className="font-semibold" style={{ color: 'var(--argus-text-primary)' }}>{pageTitle}</span>
          </div>

          <div className="flex-1" />
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

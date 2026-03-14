import TicketHistory from "./pages/agent/TicketHistory";

import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Landing
import { LandingPage } from '@/pages/landing/LandingPage';

// Route-level code splitting keeps landing payload lighter.
const EmployeeLayout = lazy(() => import('./layouts/EmployeeLayout').then((m) => ({ default: m.EmployeeLayout })));
const AgentLayout = lazy(() => import('./layouts/AgentLayout').then((m) => ({ default: m.AgentLayout })));
const SubmitTicket = lazy(() => import('@/pages/employee/SubmitTicket').then((m) => ({ default: m.SubmitTicket })));
const TicketStatus = lazy(() => import('@/pages/employee/TicketStatus').then((m) => ({ default: m.TicketStatus })));
const EscalatedQueue = lazy(() => import('@/pages/agent/EscalatedQueue').then((m) => ({ default: m.EscalatedQueue })));
const EvidenceCardView = lazy(() => import('@/pages/agent/EvidenceCardView').then((m) => ({ default: m.EvidenceCardView })));
const WhatIfSimulator = lazy(() => import('@/pages/agent/WhatIfSimulator').then((m) => ({ default: m.WhatIfSimulator })));
const MetricsDashboard = lazy(() => import('@/pages/agent/MetricsDashboard').then((m) => ({ default: m.MetricsDashboard })));
const AuditLog = lazy(() => import('@/pages/agent/AuditLog').then((m) => ({ default: m.AuditLog })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--argus-bg)' }} />}>
          <AnimatePresence mode="wait">
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />

              {/* Employee Portal */}
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<SubmitTicket />} />
                <Route path="ticket/:id" element={<TicketStatus />} />
              </Route>

              {/* Agent Portal */}
              <Route path="/agent" element={<AgentLayout />}>
                <Route index element={<EscalatedQueue />} />
          <Route path="history" element={<TicketHistory />} />
                <Route path="ticket/:id" element={<EvidenceCardView />} />
                <Route path="metrics" element={<MetricsDashboard />} />
                <Route path="simulator" element={<WhatIfSimulator />} />
                <Route path="audit" element={<AuditLog />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

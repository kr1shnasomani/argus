export interface ConfidenceSignal {
  value: number | null;
  threshold: number | null;
  passed: boolean;
}

export interface AgentResolution {
  ticket_id: string;
  resolution: string;
  resolution_type: "reusable" | "workaround" | "uncertain";
  override_reason?: string | null;
}

export interface TicketSubmission {
  description: string;
  category: string;
  severity: "P1" | "P2" | "P3" | "P4";
  user_email: string;
  system: string;
}

export interface TicketResponse {
  ticket_id: string;
  status: "processing" | "auto_resolved" | "escalated" | "resolved";
  message: string;
}

export interface TicketStatusDetail {
  id: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  created_at: string;
  resolution?: string;
  escalation_reason?: string;
  latency_ms?: number;
}

export interface EvidenceCard {
  ticket_id: string;
  description: string;
  category: string;
  severity: string;
  created_at: string;
  user_tier: string;
  user_email?: string;
  layer_intercepted: number | null;
  escalation_reason: string;
  signals: Record<string, ConfidenceSignal>;
  is_novel: boolean;
  candidate_fixes: Array<{
    ticket_id: string;
    similarity: number;
    resolution: string;
    success_rate: number;
  }>;
  total_latency_ms: number;
}

export interface AuditEntry {
  id: string;
  ticket_id: string;
  action: string;
  decision: string;
  layer: number;
  details: any;
  actor: string;
  created_at: string;
  timestamp: string;
  latency_ms: number;
  previous_hash: string;
  hash: string;
}

export interface DashboardMetrics {
  system_performance: {
    total_tickets: number;
    auto_resolved_count: number;
    escalated_count: number;
    sandbox_failures: number;
  };
  override_analysis: Record<string, number>;
  knowledge_base_coverage: {
    total_vectors: number;
    categories_covered: number;
    avg_similarity: number;
    coverage_level: "High" | "Moderate" | "Low";
  };
  drift_monitor: Record<string, any>;
}

export interface CoverageMetrics {
  total_vectors: number;
  categories_covered: number;
  coverage_status: "High" | "Moderate" | "Low";
}

export interface CategoryDrift {
  category: string;
  accuracy_change: number;
  status: "stable" | "drifting" | "improving";
}

export interface DriftData {
  analyzed_categories: number;
  drift_detected: number;
  categories: CategoryDrift[];
}

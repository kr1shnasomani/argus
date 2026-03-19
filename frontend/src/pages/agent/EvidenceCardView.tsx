import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { resolveTicket, getTicketEvidence, submitCorrection, markAgentVerified } from "@/services/agent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, Activity, AlertCircle, CheckCircle2, BookOpen, Zap, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { EvidenceCardSkeleton } from "@/components/ui/skeleton-loaders";

export const EvidenceCardView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resolutionText, setResolutionText] = useState("");
  const [resolutionType, setResolutionType] = useState<"reusable" | "workaround" | "uncertain">("reusable");
  const [overrideReason, setOverrideReason] = useState<string>("");

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["evidence-card", id],
    queryFn: () => getTicketEvidence(id!),
    enabled: !!id,
  });

  const candidateFixes = card?.candidate_fixes || card?.evidence_card?.candidate_fixes || [];
  const escalationReason =
    card?.escalation_reason ||
    card?.outcome?.escalation_reason ||
    card?.evidence_card?.escalation_reason ||
    "Unknown reason";
  const interceptedLayer = card?.layer_intercepted ?? card?.evidence_card?.layer_intercepted ?? null;
  const policyGateEscalation =
    interceptedLayer === 1 || /policy|vip|freeze|p1|p2/i.test(escalationReason || "");
  const signalA = card?.signal_a ?? card?.outcome?.signal_a ?? null;
  const signalAThreshold = card?.threshold_a ?? null;
  const signalB = card?.signal_b ?? card?.outcome?.signal_b ?? null;
  const signalBThreshold = card?.threshold_b ?? null;
  const signalC = card?.signal_c ?? card?.outcome?.signal_c ?? null;
  const signalCThreshold = card?.threshold_c ?? null;
  const displayedLatency =
    card?.total_latency_ms ??
    card?.decision_latency_ms ??
    (typeof card?.evidence_card?.decision_latency === "number" ? card.evidence_card.decision_latency : null);
  const appliedResolution =
    card?.resolution_applied ||
    card?.outcome?.resolution ||
    card?.evidence_card?.resolution_applied ||
    candidateFixes?.[0]?.resolution ||
    "Agent synthesized a novel response or resolution is unavailable.";

  const resolveMutation = useMutation({
    mutationFn: resolveTicket,
    onSuccess: () => {
      toast.success('Ticket resolved successfully', {
        description: `Resolution applied to ${id}.`,
      });
      navigate("/agent");
    },
    onError: () => {
      toast.error('Failed to resolve ticket', {
        description: 'The resolution could not be applied. Please try again.',
      });
    },
  });

  const handleMarkYes = async () => {
    if (!id) return;
    setVerificationState('yes');
    try {
      await markAgentVerified(id);
      toast.success('Marked as verified');
    } catch (e) {
      toast.error('Failed to mark verification');
      setVerificationState(null);
    }
  };

  const handleMarkNo = () => {
    setVerificationState('no');
    setShowCorrectionForm(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !correctionText) return;
    setCorrectionSubmitting(true);
    try {
      await submitCorrection(id, correctionText, correctionType);
      setCorrectionSuccess('Correction recorded. The Argus knowledge base has been updated.');
      // Update applied resolution shown in UI
      // mutate local card data to reflect corrected resolution
      (card as any).resolution = correctionText;
      toast.success('Correction submitted');
      setShowCorrectionForm(false);
    } catch (err) {
      toast.error('Failed to submit correction');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const [verificationState, setVerificationState] = useState<null | 'yes' | 'no'>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [correctionType, setCorrectionType] = useState<"verified" | "workaround">("verified");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState<string | null>(null);
  const [resolutionMode, setResolutionMode] = useState<"accept" | "override">("override");

  // Pre-fill resolution textarea with AI suggestion for escalated tickets
  const aiSuggestion = card?.outcome?.ai_suggestion;
  useEffect(() => {
    if (card?.status === "escalated" && aiSuggestion && !resolutionText) {
      setResolutionText(aiSuggestion);
    }
  }, [card?.status, aiSuggestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resolutionText) return;
    resolveMutation.mutate({
      ticket_id: id,
      resolution: resolutionText,
      resolution_type: resolutionType,
      override_reason: overrideReason || null,
    });
  };

  const handleAcceptAiResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !aiSuggestion) return;
    setResolutionText(aiSuggestion);
    setResolutionMode("accept");
    resolveMutation.mutate({
      ticket_id: id,
      resolution: aiSuggestion,
      resolution_type: "verified",
      override_reason: null,
      accept_suggestion: true,
    });
  };

  const handleSubmitDifferentResolution = (e: React.FormEvent) => {
    e.preventDefault();
    setResolutionMode("override");
    setResolutionText("");
    setOverrideReason("");
  };

  if (isLoading) {
    return <EvidenceCardSkeleton />;
  }

  if (isError || !card) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--argus-red-light)' }}>
          <AlertCircle className="h-7 w-7" style={{ color: 'var(--argus-red)' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--argus-text-primary)' }}>Ticket Not Found</h2>
        <p className="text-sm" style={{ color: 'var(--argus-text-muted)' }}>
          This ticket may have been resolved or is no longer in the queue.
        </p>
        <Button asChild variant="outline">
          <Link to="/agent">Return to Queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link to="/agent"><ArrowLeft size={16} /></Link>
          </Button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--argus-text-primary)' }}>
              Ticket #{card.ticket_id.substring(0, 8)}
            </h1>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase severity-${card.severity.toLowerCase()}`}>
              {card.severity}
            </span>
            {card.user_tier === "VIP" && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: '#EDE9FE', color: '#7C3AED' }}>VIP</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--argus-text-muted)' }}>
          <Clock size={12} />
          Received {new Date(card.created_at).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT: Evidence Panel */}
        <div className="lg:col-span-7 space-y-4">

          {/* User Request Card */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>
                <Activity size={15} style={{ color: 'var(--argus-indigo)' }} /> User Request
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full border" style={{ background: 'var(--argus-surface-2)', color: 'var(--argus-text-secondary)', borderColor: 'var(--argus-border)' }}>
                {card.category}
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs mb-3" style={{ color: 'var(--argus-text-muted)' }}>
                From: <span style={{ color: 'var(--argus-text-secondary)' }}>{card.user_email}</span>
              </p>
              <div className="p-4 rounded-xl border leading-relaxed whitespace-pre-wrap text-sm" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                {card.description}
              </div>
            </div>
          </div>

          {/* Argus Engine Trace Card */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-3 border-b" style={{ background: 'var(--argus-indigo-light)', borderColor: 'rgba(79,70,229,0.15)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--argus-indigo)' }}>
                <Activity size={15} /> Argus Engine Trace
              </div>
            </div>
            <div className="p-5 space-y-5">

              {/* Escalation Alert / Auto-Resolution Alert */}
              {card.status === "auto_resolved" ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--argus-emerald)' }} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--argus-emerald)' }}>Successfully Auto-Resolved</h4>
                    <p className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>Agent completed the request and passed sandbox validation.</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--argus-text-muted)' }}>Sandbox Output: {card.sandbox_passed ? 'Tests Passed' : 'Unknown'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'var(--argus-amber-light)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--argus-amber)' }} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--argus-amber)' }}>Human Escalation Triggered</h4>
                    <p className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>{escalationReason}</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--argus-text-muted)' }}>Pipeline halted at Layer {interceptedLayer || "N/A"}</p>
                  </div>
                </div>
              )}

              {/* Central Trace Component - Vertical Stepper */}
              <div className="pt-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--argus-text-muted)' }}>Pipeline Execution Trace</h4>
                <div className="relative border-l-2 ml-3 pl-6 space-y-6" style={{ borderColor: 'var(--argus-border)' }}>

                  {/* 1. Intake & Categorization */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: 'var(--argus-emerald)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--argus-emerald)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Intake & Categorization</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>Ticket parsed as <span style={{ color: 'var(--argus-indigo)' }}>{card.category}</span></p>
                  </div>

                  {/* 2. Policy Gate */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: interceptedLayer === 1 ? 'var(--argus-red)' : 'var(--argus-emerald)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: interceptedLayer === 1 ? 'var(--argus-red)' : 'var(--argus-emerald)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Policy Gate</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {interceptedLayer === 1 ? 'TRIGGERED' : 'PASSED'}
                    </p>
                  </div>

                  {/* 3. Vector DB Novelty Check */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: signalA != null ? (signalA >= 0.5 ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: signalA != null ? (signalA >= 0.5 ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Vector DB Novelty Check</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      Max similarity: {signalA != null ? `${(signalA * 100).toFixed(1)}%` : 'N/A'} / 50.0% threshold
                    </p>
                  </div>

                  {/* 4. Signal A */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: signalA != null && signalAThreshold != null ? (signalA >= signalAThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: signalA != null && signalAThreshold != null ? (signalA >= signalAThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Signal A (Semantic Similarity)</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {signalA != null && signalAThreshold != null ? `${signalA.toFixed(3)} vs ${signalAThreshold.toFixed(2)} threshold` : 'Skipped or unavailable'}
                    </p>
                  </div>

                  {/* 5. Signal B */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: signalB != null && signalBThreshold != null ? (signalB >= signalBThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: signalB != null && signalBThreshold != null ? (signalB >= signalBThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Signal B (Resolution Consistency)</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {signalB != null && signalBThreshold != null ? `${signalB.toFixed(3)} vs ${signalBThreshold.toFixed(2)} threshold` : 'Skipped or unavailable'}
                    </p>
                  </div>

                  {/* 6. Signal C */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: signalC != null && signalCThreshold != null ? (signalC >= signalCThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: signalC != null && signalCThreshold != null ? (signalC >= signalCThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)') : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Signal C (Category Accuracy)</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {signalC != null && signalCThreshold != null ? `${signalC.toFixed(3)} vs ${signalCThreshold.toFixed(2)} threshold` : 'Skipped or unavailable'}
                    </p>
                  </div>

                  {/* 7. Sandbox Execution */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: card.sandbox_passed || card.status === 'auto_resolved' ? 'var(--argus-emerald)' : interceptedLayer === 6 ? 'var(--argus-red)' : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: card.sandbox_passed || card.status === 'auto_resolved' ? 'var(--argus-emerald)' : interceptedLayer === 6 ? 'var(--argus-red)' : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Sandbox Execution</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {card.status === 'auto_resolved' || card.sandbox_passed ? 'PASSED' : interceptedLayer === 6 ? 'FAILED' : 'SKIPPED'}
                    </p>
                  </div>

                  {/* 8. Decision */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: card.status === 'auto_resolved' ? 'var(--argus-emerald)' : 'var(--argus-amber)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: card.status === 'auto_resolved' ? 'var(--argus-emerald)' : 'var(--argus-amber)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Decision</h5>
                    <p className="text-xs mt-1" style={{ color: card.status === 'auto_resolved' ? 'var(--argus-emerald)' : 'var(--argus-amber)' }}>
                      {card.status === 'auto_resolved' ? 'AUTO RESOLVED' : 'HUMAN ESCALATION REQUIRED'}
                    </p>
                  </div>

                </div>
              </div>

              {/* How Argus Decided — Explainable AI Panel */}
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--argus-text-muted)' }}>
                  <Activity size={12} /> How Argus Decided
                </h4>

                {/* Signal A/B/C Breakdown */}
                {card.status === "auto_resolved" || signalA != null || signalB != null || signalC != null ? (
                  <div className="space-y-2.5 mb-4">
                    {/* Signal A */}
                    {signalA != null && signalAThreshold != null && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Signal A — Semantic Similarity</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-semibold" style={{ color: signalA >= signalAThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)' }}>
                              {signalA.toFixed(3)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${signalA >= signalAThreshold ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {signalA >= signalAThreshold ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--argus-border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (signalA / (signalAThreshold * 2)) * 100)}%`,
                              background: signalA >= signalAThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)',
                            }}
                          />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>threshold: {signalAThreshold.toFixed(2)} · found similar past incident</p>
                      </div>
                    )}

                    {/* Signal B */}
                    {signalB != null && signalBThreshold != null && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Signal B — Resolution Consistency</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-semibold" style={{ color: signalB >= signalBThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)' }}>
                              {signalB.toFixed(3)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${signalB >= signalBThreshold ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {signalB >= signalBThreshold ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--argus-border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (signalB / (signalBThreshold * 2)) * 100)}%`,
                              background: signalB >= signalBThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)',
                            }}
                          />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>threshold: {signalBThreshold.toFixed(2)} · cluster pattern confirmed</p>
                      </div>
                    )}

                    {/* Signal C */}
                    {signalC != null && signalCThreshold != null && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Signal C — Category Accuracy</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-semibold" style={{ color: signalC >= signalCThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)' }}>
                              {signalC.toFixed(3)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${signalC >= signalCThreshold ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {signalC >= signalCThreshold ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                        <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--argus-border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (signalC / (signalCThreshold * 2)) * 100)}%`,
                              background: signalC >= signalCThreshold ? 'var(--argus-emerald)' : 'var(--argus-red)',
                            }}
                          />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>threshold: {signalCThreshold.toFixed(2)} · category label verified</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Why This Decision */}
                <div className="rounded-xl border p-3.5" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--argus-text-muted)' }}>Why This Decision</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--argus-text-primary)' }}>
                    {card.status === 'auto_resolved'
                      ? 'All three confidence signals exceeded their thresholds and sandbox tests passed. Argus executed the most-similar past resolution automatically.'
                      : policyGateEscalation
                      ? 'The Policy Gate escalated this ticket before AI processing — likely due to VIP tier, P1/P2 severity, or a policy-matched keyword.'
                      : interceptedLayer === 2
                      ? 'The Vector DB Novelty Check detected insufficient similarity to known resolutions. Escalated to human for a novel approach.'
                      : interceptedLayer === 3
                      ? `Signal A (Semantic Similarity) fell below its threshold (${signalA?.toFixed(3) ?? '?'} < ${signalAThreshold?.toFixed(2) ?? '?'}). No closely matching past incidents.`
                      : interceptedLayer === 4
                      ? `Signal B (Resolution Consistency) fell below threshold (${signalB?.toFixed(3) ?? '?'} < ${signalBThreshold?.toFixed(2) ?? '?'}). Inconsistent resolution pattern in cluster.`
                      : interceptedLayer === 5
                      ? `Signal C (Category Accuracy) fell below threshold (${signalC?.toFixed(3) ?? '?'} < ${signalCThreshold?.toFixed(2) ?? '?'}). Ticket may be miscategorized.`
                      : interceptedLayer === 6
                      ? 'Sandbox validation failed. The proposed resolution did not execute successfully in the isolated test environment.'
                      : escalationReason || 'Escalated due to insufficient confidence signals or sandbox failure. Agent review required.'}
                  </p>
                </div>

                {/* Top 3 Similar Past Incidents */}
                {candidateFixes && candidateFixes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--argus-text-muted)' }}>
                      <BookOpen size={11} /> Similar Past Incidents
                    </p>
                    <div className="space-y-2">
                      {candidateFixes.slice(0, 3).map((fix, idx) => (
                        <motion.div
                          key={idx}
                          className="candidate-fix p-3 rounded-xl border cursor-pointer"
                          style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}
                          onClick={() => setResolutionText(fix.resolution)}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08, duration: 0.3 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-xs font-medium" style={{ color: 'var(--argus-indigo)' }}>#{(fix.ticket_id || 'N/A').substring(0, 8)}</span>
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--argus-emerald)' }}>
                              {typeof (fix as any).similarity_score === 'number'
                                ? `${(((fix as any).similarity_score as number) * 100).toFixed(1)}% match`
                                : (typeof fix.similarity === 'number' ? `${(fix.similarity * 100).toFixed(1)}% match` : 'match n/a')}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-2" style={{ color: 'var(--argus-text-secondary)' }}>{fix.resolution}</p>
                          <p className="text-[10px] mt-1 text-right" style={{ color: 'var(--argus-text-muted)' }}>↑ Click to apply</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {(!candidateFixes || candidateFixes.length === 0) && card.status === 'escalated' && (
                  <div className="mt-3 p-3.5 rounded-xl border text-xs" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' }}>
                    {policyGateEscalation
                      ? 'Policy Gate escalated before candidate evaluation.'
                      : 'No similar past incidents found — this appears to be a novel issue.'}
                  </div>
                )}
              </div>

              {/* Latency */}
              <div className="flex items-center gap-2 pt-3 border-t text-xs" style={{ borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' }}>
                <Zap size={11} style={{ color: 'var(--argus-indigo)' }} />
                Total inference latency:
                <span className="font-mono font-semibold" style={{ color: 'var(--argus-text-primary)' }}>
                  {displayedLatency != null ? `${displayedLatency.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>

              {/* Audit Hash / Tamper-Proof Verification */}
              {card.audit_log && (
                <div className="flex items-center gap-2 pt-3 border-t text-xs" style={{ borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' }}>
                  <Lock size={11} style={{ color: 'var(--argus-emerald)' }} />
                  <span>SHA-256:</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--argus-text-primary)' }}>
                    {card.audit_log.audit_hash?.slice(0, 16)}...
                  </span>
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--argus-emerald)' }}>Tamper-Proof Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Resolution Workspace or Auto-Resolution Audit */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            {card.status === "auto_resolved" ? (
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-lg)' }}>
                <div className="h-1 w-full" style={{ background: 'var(--argus-emerald)' }} />
                <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--argus-border)' }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--argus-emerald)' }}>
                    <CheckCircle2 size={16} /> Auto-Resolution Audit
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>This ticket was handled autonomously by Argus.</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Applied Resolution</Label>
                    <div className="p-4 rounded-xl border text-sm whitespace-pre-wrap" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                      {appliedResolution}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg border flex items-start gap-3 mt-4" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <Activity size={16} className="mt-0.5" style={{ color: 'var(--argus-emerald)' }} />
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: 'var(--argus-emerald)' }}>Validation Complete</h4>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--argus-text-muted)' }}>
                        Sandbox tests executed successfully. No human intervention was required.
                      </p>
                    </div>
                  </div>

                  {/* Agent verification controls for auto-resolved tickets */}
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium" style={{ color: 'var(--argus-text-primary)' }}>Was this resolution correct?</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleMarkYes}
                        className={`px-3 py-1.5 rounded-md font-semibold ${verificationState === 'yes' ? 'bg-emerald-500 text-white' : 'bg-white border'}`}
                      >
                        ✓ Yes, correct
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkNo}
                        className={`px-3 py-1.5 rounded-md font-semibold ${verificationState === 'no' ? 'bg-red-500 text-white' : 'bg-white border'}`}
                      >
                        ✗ No, incorrect
                      </button>
                    </div>

                    {showCorrectionForm && (
                      <form onSubmit={handleSubmitCorrection} className="p-3 rounded-lg border mt-2" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">What was the correct resolution?</Label>
                          <Textarea required rows={5} value={correctionText} onChange={(e) => setCorrectionText(e.target.value)} />
                        </div>
                        <div className="mt-3">
                          <Label className="text-sm font-medium">Resolution Type</Label>
                          <div className="flex items-center gap-3 mt-2">
                            <button type="button" onClick={() => setCorrectionType('verified')} className={`px-3 py-1 rounded ${correctionType === 'verified' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>Verified Reusable Fix</button>
                            <button type="button" onClick={() => setCorrectionType('workaround')} className={`px-3 py-1 rounded ${correctionType === 'workaround' ? 'bg-amber-600 text-white' : 'bg-white border'}`}>Temporary Workaround</button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button type="submit" disabled={correctionSubmitting} className="h-10">
                            {correctionSubmitting ? 'Submitting...' : 'Submit Correction'}
                          </Button>
                        </div>
                        {correctionSuccess && <div className="text-sm text-emerald-600 mt-3">{correctionSuccess}</div>}
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-lg)' }}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--argus-indigo) 0%, #7C3AED 100%)' }} />
                <form onSubmit={handleSubmit}>
                  <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--argus-border)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Submit Human Resolution</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>Resolve this ticket and train the Argus model.</p>
                  </div>
                  <div className="p-5 space-y-5">

                  {/* Resolution Text */}
                    {card.outcome && card.outcome.ai_suggestion && (
                      <div className="rounded-xl border p-3.5 mb-2" style={{ background: 'linear-gradient(90deg, #EEF2FF 0%, #F5F3FF 100%)', borderColor: 'rgba(124,58,237,0.12)' }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--argus-indigo)' }}>🤖 AI SUGGESTED RESOLUTION</div>
                            <p className="text-sm mt-1" style={{ color: 'var(--argus-text-primary)' }}>{card.outcome.ai_suggestion}</p>
                          </div>
                          <div>
                            <Button variant="outline" onClick={() => setResolutionText(card.outcome?.ai_suggestion || "")}>✓ Use This Solution</Button>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Resolution Steps</Label>
                    <Textarea
                      required
                      placeholder="Detail the steps taken to resolve this issue..."
                      rows={7}
                      className="resize-none text-sm"
                      style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                    />
                  </div>

                  {/* Resolution Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Feedback Type to AI</Label>
                    <RadioGroup value={resolutionType} onValueChange={(val: any) => setResolutionType(val)} className="space-y-2">
                      {[
                        { value: 'reusable', label: 'Verified Reusable Fix', desc: 'Embeds into vector knowledge base to train AI.', accent: 'var(--argus-indigo-light)', border: 'rgba(79,70,229,0.3)' },
                        { value: 'workaround', label: 'Temporary Workaround', desc: 'Resolves ticket but AI will not learn from it.', accent: 'var(--argus-amber-light)', border: 'rgba(217,119,6,0.2)' },
                        { value: 'uncertain', label: 'Uncertain / Site-Specific', desc: 'Highly specific — do NOT train AI.', accent: 'var(--argus-surface-2)', border: 'var(--argus-border)' },
                      ].map(opt => (
                        <div
                          key={opt.value}
                          className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                          style={{ background: resolutionType === opt.value ? opt.accent : 'var(--argus-surface-2)', borderColor: resolutionType === opt.value ? opt.border : 'var(--argus-border)' }}
                          onClick={() => setResolutionType(opt.value as any)}
                        >
                          <RadioGroupItem value={opt.value} id={`r-${opt.value}`} className="mt-0.5" />
                          <div>
                            <Label htmlFor={`r-${opt.value}`} className="font-semibold text-xs cursor-pointer" style={{ color: 'var(--argus-text-primary)' }}>
                              {opt.label}
                            </Label>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>{opt.desc}</p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator style={{ background: 'var(--argus-border)' }} />

                  {/* Override Reason */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>
                      Override Context <span style={{ color: 'var(--argus-text-muted)', fontWeight: 400 }}>(optional)</span>
                    </Label>
                    <Select value={overrideReason} onValueChange={setOverrideReason}>
                      <SelectTrigger style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                        <SelectValue placeholder="Why did the AI fail?" />
                      </SelectTrigger>
                      <SelectContent style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)' }}>
                        <SelectItem value="missing_context" style={{ color: 'var(--argus-text-primary)' }}>Missing system context</SelectItem>
                        <SelectItem value="incorrect_suggestion" style={{ color: 'var(--argus-text-primary)' }}>AI suggested incorrect fix</SelectItem>
                        <SelectItem value="vip_policy" style={{ color: 'var(--argus-text-primary)' }}>VIP Policy Gate correctly triggered</SelectItem>
                        <SelectItem value="novel_issue" style={{ color: 'var(--argus-text-primary)' }}>Completely novel issue class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {resolveMutation.isError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border text-sm" style={{ background: 'var(--argus-red-light)', borderColor: 'rgba(220,38,38,0.2)', color: 'var(--argus-red)' }}>
                      <AlertCircle size={14} /> Failed to submit resolution.
                    </div>
                  )}

                  {/* Dual Action Buttons for Escalated Tickets */}
                  {card.status === 'escalated' && aiSuggestion ? (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={handleAcceptAiResolution}
                        disabled={resolveMutation.isPending}
                        className="w-full h-11 rounded-xl font-semibold text-sm text-white border-0 transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ background: '#10B981' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#059669')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#10B981')}
                      >
                        {resolveMutation.isPending && resolutionMode === 'accept' ? (
                          <><Loader2 className="h-4 w-4 animate-spin" />Accepting...</>
                        ) : (
                          <><CheckCircle2 size={15} /> Accept AI Resolution</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitDifferentResolution}
                        disabled={resolveMutation.isPending}
                        className="w-full h-11 rounded-xl font-semibold text-sm border-2 transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ background: 'transparent', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--argus-surface-2)'; e.currentTarget.style.borderColor = 'var(--argus-indigo)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--argus-border)'; }}
                      >
                        <Zap size={14} /> Submit Different Resolution
                      </button>
                      {resolutionMode === 'override' && resolutionText && (
                        <Button
                          type="submit"
                          disabled={resolveMutation.isPending || !resolutionText}
                          className="w-full h-11 text-white font-semibold text-sm border-0"
                          style={{ background: 'var(--argus-indigo)' }}
                        >
                          {resolveMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting Override...</>
                          ) : (
                            "Submit Override Resolution →"
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={resolveMutation.isPending || !resolutionText}
                      className="w-full h-11 text-white font-semibold text-sm border-0 gradient-btn"
                    >
                      {resolveMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalizing...</>
                      ) : (
                        "Submit Resolution →"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { resolveTicket, getTicketEvidence } from "@/services/agent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, XCircle, BrainCircuit, Activity, AlertCircle, CheckCircle2, BookOpen, Zap, Loader2 } from "lucide-react";
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

  const renderSignal = (name: string, signal: { value: number | null; threshold: number | null; passed: boolean }) => {
    if (!signal) return null;
    const valueStr = signal.value !== null ? (signal.value * 100).toFixed(1) + "%" : "N/A";
    const thresholdStr = signal.threshold !== null ? (signal.threshold * 100).toFixed(1) + "%" : "N/A";
    const percent = signal.value !== null ? signal.value * 100 : 0;
    return (
      <motion.div
        className="space-y-1.5 mb-4"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--argus-text-primary)' }}>
            {signal.passed
              ? <CheckCircle2 size={14} style={{ color: 'var(--argus-emerald)' }} />
              : <XCircle size={14} style={{ color: 'var(--argus-red)' }} />
            }
            {name}
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--argus-text-muted)' }}>
            <span style={{ color: signal.passed ? 'var(--argus-emerald)' : 'var(--argus-red)' }}>{valueStr}</span>
            {' / '}{thresholdStr}
          </span>
        </div>
        <div className="signal-bar-track">
          <div
            className="signal-bar-fill"
            style={{
              width: `${Math.max(percent, 2)}%`,
              background: signal.passed ? 'var(--argus-emerald)' : signal.value === null ? 'var(--argus-border)' : 'var(--argus-red)'
            }}
          />
        </div>
      </motion.div>
    );
  };

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
                <BrainCircuit size={15} /> Argus Engine Trace
              </div>
            </div>
            <div className="p-5 space-y-5">

              {/* Escalation Alert */}
              <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'var(--argus-amber-light)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--argus-amber)' }} />
                <div>
                  <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--argus-amber)' }}>Human Escalation Triggered</h4>
                  <p className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>{card.escalation_reason}</p>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--argus-text-muted)' }}>Pipeline halted at Layer {card.layer_intercepted}</p>
                </div>
              </div>

              {/* Confidence Signals */}
              {card.signals ? (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--argus-text-muted)' }}>Detection Signals</h4>
                  {renderSignal("Semantic Similarity", card.signals["semantic_similarity"] || { value: null, threshold: null, passed: false })}
                  {renderSignal("Cohort Consensus", card.signals["cohort_consensus"] || { value: null, threshold: null, passed: false })}
                  {renderSignal("Historical Success", card.signals["historical_success"] || { value: null, threshold: null, passed: false })}
                  <div className="flex justify-between items-center text-sm mt-2 p-3 rounded-lg border" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>Novelty Detection</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${card.is_novel ? 'status-escalated' : 'status-auto_resolved'}`}>
                      {card.is_novel ? "NOVEL ISSUE" : "KNOWN ARCHETYPE"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border text-center text-sm" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' }}>
                  No AI signal data — this ticket was escalated directly.
                </div>
              )}

              {/* Candidate Fixes */}
              {card.candidate_fixes && card.candidate_fixes.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--argus-text-muted)' }}>
                    <BookOpen size={12} /> Candidate Solutions
                  </h4>
                  <div className="space-y-2">
                    {card.candidate_fixes.map((fix, idx) => (
                      <motion.div
                        key={idx}
                        className="candidate-fix p-3.5 rounded-xl border cursor-pointer"
                        style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}
                        onClick={() => setResolutionText(fix.resolution)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-mono text-xs font-medium" style={{ color: 'var(--argus-indigo)' }}>#{fix.ticket_id.substring(0, 8)}</span>
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--argus-emerald)' }}>
                            {(fix.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <p className="text-xs line-clamp-2" style={{ color: 'var(--argus-text-secondary)' }}>{fix.resolution}</p>
                        <p className="text-[10px] mt-1.5 text-right" style={{ color: 'var(--argus-text-muted)' }}>↑ Click to apply</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latency */}
              <div className="flex items-center gap-2 pt-3 border-t text-xs" style={{ borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' }}>
                <Zap size={11} style={{ color: 'var(--argus-indigo)' }} />
                Total inference latency:
                <span className="font-mono font-semibold" style={{ color: 'var(--argus-text-primary)' }}>
                  {card.total_latency_ms != null ? `${card.total_latency_ms.toFixed(0)}ms` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Resolution Workspace */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-lg)' }}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--argus-indigo) 0%, #7C3AED 100%)' }} />
              <form onSubmit={handleSubmit}>
                <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--argus-border)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Submit Human Resolution</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>Resolve this ticket and train the Argus model.</p>
                </div>
                <div className="p-5 space-y-5">

                  {/* Resolution Text */}
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
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { submitTicket } from "@/services/tickets";
import { getSystems } from "@/services/config";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  UploadCloud,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type System = {
  id: string;
  name: string;
};

export const SubmitTicket = () => {
  const navigate = useNavigate();
  const [systems, setSystems] = useState<System[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    user_email: "",
    system_id: "",
    urgent: false,
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setLoadingSystems(true);
        const data = await getSystems();
        setSystems(data);
      } catch (error) {
        console.error("Failed to load systems:", error);
        toast.error("Failed to load systems", {
          description: "Please refresh and try again.",
        });
      } finally {
        setLoadingSystems(false);
      }
    };

    fetchSystems();
  }, []);

  const mutation = useMutation({
    mutationFn: submitTicket,
    onSuccess: (data) => {
      toast.success("Request submitted", {
        description: `Ticket ${data.ticket_id} is being processed.`,
      });
      setSubmittedTicketId(data.ticket_id);
    },
    onError: (error: unknown) => {
      let description = "Please check your connection and try again.";
      if (axios.isAxiosError(error)) {
        const apiDetail = error.response?.data?.detail;
        if (typeof apiDetail === "string" && apiDetail.trim()) {
          description = apiDetail;
        }
      }
      toast.error("Submission failed", {
        description,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("description", formData.description);
    if (formData.category) fd.append("category", formData.category);
    fd.append("urgent", formData.urgent.toString());
    fd.append("user_email", formData.user_email);
    fd.append("system_id", formData.system_id);
    if (file) fd.append("file", file);
    mutation.mutate(fd);
  };

  const categories = [
    "Password Reset", "Email Access", "Hardware Issue",
    "Software Installation", "Network Connectivity",
    "Authentication (2FA)", "VPN Access", "Application Bug",
  ];

  const toggleUrgent = () => {
    setFormData((prev) => ({ ...prev, urgent: !prev.urgent }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      <section
        className="relative overflow-hidden rounded-2xl border px-5 py-6 sm:px-7 sm:py-7"
        style={{
          background:
            "linear-gradient(140deg, rgba(79,70,229,0.08) 0%, rgba(8,145,178,0.06) 38%, rgba(255,255,255,0.95) 100%)",
          borderColor: "var(--argus-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="absolute -top-16 right-[-90px] w-[250px] h-[250px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(99,102,241,0.16)" }} />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-[0.14em] mb-4"
              style={{ borderColor: "var(--argus-border-subtle)", color: "var(--argus-indigo)", background: "rgba(79,70,229,0.08)" }}>
              <Sparkles size={12} />
              Employee Request Console
            </div>
            <h1 className="text-[30px] sm:text-[36px] font-bold leading-[1.05] tracking-[-0.02em]" style={{ color: "var(--argus-text-primary)" }}>
              Submit a new IT request
            </h1>
            <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed" style={{ color: "var(--argus-text-secondary)" }}>
              Share issue details once. Argus evaluates policy, similarity, and sandbox safety before auto-resolution or escalation.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-left w-full max-w-[420px]">
            <div className="rounded-xl border px-3 py-2.5 min-h-[72px] flex flex-col justify-between" style={{ borderColor: "var(--argus-border)", background: "var(--argus-surface)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--argus-text-muted)" }}>Checks</p>
              <p className="text-[20px] font-bold mt-1" style={{ color: "var(--argus-text-primary)" }}>5</p>
            </div>
            <div className="rounded-xl border px-3 py-2.5 min-h-[72px] flex flex-col justify-between" style={{ borderColor: "var(--argus-border)", background: "var(--argus-surface)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--argus-text-muted)" }}>Signals</p>
              <p className="text-[20px] font-bold mt-1" style={{ color: "var(--argus-text-primary)" }}>3</p>
            </div>
            <div className="rounded-xl border px-3 py-2.5 min-h-[72px] flex flex-col justify-between" style={{ borderColor: "var(--argus-border)", background: "var(--argus-surface)" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--argus-text-muted)" }}>Mode</p>
              <p className="text-[13px] font-semibold mt-1" style={{ color: "var(--argus-text-primary)" }}>HITL + Auto</p>
            </div>
          </div>
        </div>
      </section>

      {submittedTicketId ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 space-y-6 bg-[var(--argus-surface)] rounded-2xl border border-[var(--argus-border)] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--argus-emerald-light)] flex items-center justify-center text-[var(--argus-emerald)]">
            <CheckCircle2 size={32} />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-[var(--argus-text-primary)]">Ticket Submitted Successfully</h2>
            <p className="text-[15px] text-[var(--argus-text-secondary)]">
              Your request has been routed to the Argus engine for analysis. It will be evaluated for similarity, policy compliance, and potential auto-resolution.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-md">
            <Button
              onClick={() => navigate(`/agent/ticket/${submittedTicketId}`)}
              className="flex-1 h-11 emp-btn-primary"
            >
              View Ticket Status
            </Button>
            <Button
              onClick={() => {
                setSubmittedTicketId(null);
                setFormData({ ...formData, description: "", category: "" });
                setFile(null);
              }}
              variant="outline"
              className="flex-1 h-11"
              style={{ borderColor: "var(--argus-border)", color: "var(--argus-text-primary)" }}
            >
              Submit Another
            </Button>
            <Button
              onClick={() => navigate(`/agent`)}
              variant="outline"
              className="flex-1 h-11"
              style={{ borderColor: "var(--argus-border)", color: "var(--argus-text-primary)" }}
            >
              Agent Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div
            className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--argus-surface)",
            borderColor: "var(--argus-border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="h-[3px]" style={{ background: "linear-gradient(90deg, var(--argus-indigo), var(--argus-cyan))" }} />

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="space-y-2 md:col-span-7">
                <Label htmlFor="email" className="text-[13px] font-semibold" style={{ color: "var(--argus-text-secondary)" }}>
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={formData.user_email}
                  onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  className="h-11"
                  style={{
                    background: "var(--argus-surface-2)",
                    borderColor: "var(--argus-border)",
                    color: "var(--argus-text-primary)",
                  }}
                />
              </div>

              <div className="space-y-2 md:col-span-5">
                <Label className="text-[13px] font-semibold" style={{ color: "var(--argus-text-secondary)" }}>
                  System
                </Label>
                <Select value={formData.system_id} onValueChange={(val) => setFormData({ ...formData, system_id: val })}>
                  <SelectTrigger className="h-11" style={{ background: "var(--argus-surface-2)", borderColor: "var(--argus-border)", color: "var(--argus-text-primary)" }} disabled={loadingSystems}>
                    <SelectValue placeholder={loadingSystems ? "Loading systems..." : "Select a system"} />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--argus-surface)", borderColor: "var(--argus-border)" }}>
                    {systems.map((system) => (
                      <SelectItem key={system.id} value={system.id} style={{ color: "var(--argus-text-primary)" }}>
                        {system.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="space-y-2 md:col-span-7">
                  <Label className="text-[13px] font-semibold" style={{ color: "var(--argus-text-secondary)" }}>
                    Category (optional — AI will detect)
                  </Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger className="h-11" style={{ background: "var(--argus-surface-2)", borderColor: "var(--argus-border)", color: "var(--argus-text-primary)" }}>
                      <SelectValue placeholder="Select issue category" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "var(--argus-surface)", borderColor: "var(--argus-border)" }}>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} style={{ color: "var(--argus-text-primary)" }}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[12px] opacity-70" style={{ color: "var(--argus-text-muted)" }}>
                    Leave blank and Argus will classify automatically.
                  </p>
              </div>

              <button
                type="button"
                onClick={toggleUrgent}
                className={`md:col-span-5 emp-urgent-panel min-h-[98px] ${formData.urgent ? "is-active" : ""}`}
                aria-pressed={formData.urgent}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-left">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--argus-text-primary)" }}>
                      Mark as urgent
                    </p>
                    <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--argus-text-muted)" }}>
                      Prioritizes queue visibility for manual review.
                    </p>
                  </div>
                  <Switch
                    id="urgent-toggle"
                    checked={formData.urgent}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, urgent: checked }))}
                    onClick={(e) => e.stopPropagation()}
                    className="emp-urgent-switch"
                  />
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold" style={{ color: "var(--argus-text-secondary)" }}>
                Issue description
              </Label>
              <Textarea
                required
                rows={5}
                placeholder="Include error text, what changed, steps to reproduce, and impacted users or systems..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="resize-none"
                style={{ background: "var(--argus-surface-2)", borderColor: "var(--argus-border)", color: "var(--argus-text-primary)" }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold" style={{ color: "var(--argus-text-secondary)" }}>
                Attachment <span style={{ color: "var(--argus-text-muted)", fontWeight: 500 }}>(optional)</span>
              </Label>
              <div
                className="border-2 border-dashed rounded-xl min-h-[112px] px-4 py-4 text-center cursor-pointer transition-all flex flex-col justify-center"
                style={{
                  borderColor: file ? "var(--argus-indigo)" : "var(--argus-border)",
                  background: file ? "var(--argus-indigo-light)" : "transparent",
                }}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <UploadCloud className="mx-auto h-[18px] w-[18px] mb-1.5" style={{ color: file ? "var(--argus-indigo)" : "var(--argus-text-muted)" }} />
                <p className="text-[12.5px] font-medium leading-snug" style={{ color: file ? "var(--argus-indigo)" : "var(--argus-text-muted)" }}>
                  {file ? file.name : "Drop screenshot/log or click to upload"}
                </p>
                <input id="file-upload" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {mutation.isError && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-lg border text-sm"
                style={{ background: "var(--argus-red-light)", borderColor: "rgba(220, 38, 38, 0.15)", color: "var(--argus-red)" }}
              >
                <AlertCircle size={14} />
                Failed to submit. Please check backend connection.
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-[14px] font-semibold emp-btn-primary"
              disabled={mutation.isPending || !formData.description || !formData.user_email || !formData.system_id}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing request...
                </>
              ) : (
                <>
                  Submit Request
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="space-y-4 xl:sticky xl:top-[76px]">
          <div className="emp-context-card">
            <h3 className="text-[13px] font-semibold mb-4" style={{ color: "var(--argus-text-primary)" }}>
              Processing flow
            </h3>
            <div className="space-y-4">
              {[
                { icon: ShieldCheck, title: "Policy checks", desc: "Severity, VIP, incident, and freeze gates." },
                { icon: Cpu, title: "Confidence engine", desc: "Similarity + consistency + category accuracy." },
                { icon: CheckCircle2, title: "Outcome", desc: "Auto-resolve or route to IT agent with evidence." },
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--argus-indigo-light)", color: "var(--argus-indigo)" }}>
                    <item.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--argus-text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "var(--argus-text-muted)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="emp-context-card">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={13} style={{ color: "var(--argus-indigo)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--argus-text-muted)" }}>
                Decision mode
              </span>
            </div>
            <p className="text-lg font-bold tracking-tight" style={{ color: "var(--argus-text-primary)" }}>
              Deterministic + confidence-based
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--argus-text-muted)" }}>
              Auto-resolve only when all checks pass, otherwise route to agent review.
            </p>
          </div>

          <div className="emp-context-card">
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--argus-text-primary)" }}>
              Faster triage tips
            </h3>
            <ul className="space-y-2.5 text-[12px]" style={{ color: "var(--argus-text-muted)" }}>
              <li className="flex items-start gap-2">
                <Sparkles size={11} className="mt-0.5 flex-shrink-0" style={{ color: "var(--argus-indigo)" }} />
                Include exact error messages verbatim
              </li>
              <li className="flex items-start gap-2">
                <Sparkles size={11} className="mt-0.5 flex-shrink-0" style={{ color: "var(--argus-indigo)" }} />
                Mention when the issue first started
              </li>
              <li className="flex items-start gap-2">
                <Sparkles size={11} className="mt-0.5 flex-shrink-0" style={{ color: "var(--argus-indigo)" }} />
                Add screenshots if the issue is visual
              </li>
            </ul>
          </div>
        </div>
        </div>
      )}
    </motion.div>
  );
};

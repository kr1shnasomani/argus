import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Play, GitMerge, FileText, ShieldAlert, Cpu, AlertCircle, ArrowRightCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SimulationParams {
  description: string;
  user_tier: string;
  severity: string;
  system: string;
  change_freeze_active: boolean;
  active_incident: boolean;
}

interface SimulationResponse {
  layer_intercepted: number | null;
  reason: string;
  signals?: Record<string, number>;
}

export const WhatIfSimulator = () => {
  const [formData, setFormData] = useState<SimulationParams>({
    description: "",
    user_tier: "Standard",
    severity: "P3",
    system: "Frontend",
    change_freeze_active: false,
    active_incident: false,
  });

  const mutation = useMutation<SimulationResponse, Error, SimulationParams>({
    mutationFn: async (params) => {
      const { data } = await api.post<SimulationResponse>("/config/simulate", params);
      return data;
    },
  });

  const handleSimulate = () => {
    mutation.mutate(formData);
  };

  const getLayerStyle = (layerNum: number, interceptedLayer?: number | null): React.CSSProperties => {
    if (!interceptedLayer) return { background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)' };
    if (layerNum < interceptedLayer) return { background: 'var(--argus-emerald-light)', borderColor: 'rgba(5,150,105,0.3)', color: 'var(--argus-emerald)' };
    if (layerNum === interceptedLayer) return { background: 'var(--argus-amber-light)', borderColor: 'rgba(217,119,6,0.5)', color: 'var(--argus-amber)', boxShadow: '0 0 15px rgba(245,158,11,0.15)' };
    return { background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-muted)', opacity: 0.5 };
  };

  const PipelineStage = ({ num, title, icon: Icon, desc }: any) => {
    const isIntercepted = mutation.data?.layer_intercepted === num;
    const isPassed = mutation.data?.layer_intercepted ? num < mutation.data.layer_intercepted : false;
    return (
      <motion.div
        className="relative flex flex-col p-4 rounded-xl border transition-all duration-500"
        style={getLayerStyle(num, mutation.data?.layer_intercepted)}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: num * 0.1, duration: 0.35 }}
      >
        {isIntercepted && (
          <motion.span
            className="absolute -top-2.5 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: 'var(--argus-amber)', color: '#fff' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            INTERCEPTED
          </motion.span>
        )}
        <div className="flex items-center mb-2">
          <div 
            className="flex items-center justify-center w-8 h-8 rounded-full border mr-3"
            style={{ 
              background: isIntercepted ? 'var(--argus-amber-light)' : isPassed ? 'var(--argus-emerald-light)' : 'var(--argus-surface)',
              borderColor: isIntercepted ? 'rgba(217,119,6,0.4)' : isPassed ? 'rgba(5,150,105,0.3)' : 'var(--argus-border)'
            }}
          >
            {isPassed ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--argus-emerald)' }} /> : <Icon className="w-4 h-4" />}
          </div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--argus-text-primary)' }}>Layer {num}: {title}</h3>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>{desc}</p>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="space-y-6 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--argus-text-primary)' }}>What-If Simulator</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--argus-text-muted)' }}>Test edge cases without affecting production tickets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: INPUT PARAMETERS */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
            <FileText size={15} style={{ color: 'var(--argus-indigo)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Simulation Parameters</span>
          </div>
          <div className="p-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Ticket Description</Label>
              <Textarea
                placeholder="Describe the hypothetical issue..."
                className="h-32 resize-none text-sm"
                style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>User Tier</Label>
                <Select value={formData.user_tier} onValueChange={(v: string) => setFormData({...formData, user_tier: v})}>
                  <SelectTrigger style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)' }}>
                    <SelectItem value="Standard" style={{ color: 'var(--argus-text-primary)' }}>Standard User</SelectItem>
                    <SelectItem value="VIP" style={{ color: 'var(--argus-text-primary)' }}>VIP (C-Suite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>Severity</Label>
                <Select value={formData.severity} onValueChange={(v: string) => setFormData({...formData, severity: v})}>
                  <SelectTrigger style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)' }}>
                    <SelectItem value="P1" style={{ color: 'var(--argus-red)' }}>P1 — Critical</SelectItem>
                    <SelectItem value="P2" style={{ color: 'var(--argus-amber)' }}>P2 — High</SelectItem>
                    <SelectItem value="P3" style={{ color: 'var(--argus-text-primary)' }}>P3 — Medium</SelectItem>
                    <SelectItem value="P4" style={{ color: 'var(--argus-text-muted)' }}>P4 — Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-secondary)' }}>System Context</Label>
              <Select value={formData.system} onValueChange={(v: string) => setFormData({...formData, system: v})}>
                <SelectTrigger style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)' }}>
                  <SelectItem value="Frontend" style={{ color: 'var(--argus-text-primary)' }}>Frontend</SelectItem>
                  <SelectItem value="Backend" style={{ color: 'var(--argus-text-primary)' }}>Backend</SelectItem>
                  <SelectItem value="Database" style={{ color: 'var(--argus-text-primary)' }}>Database</SelectItem>
                  <SelectItem value="Network" style={{ color: 'var(--argus-text-primary)' }}>Network</SelectItem>
                  <SelectItem value="ThirdParty" style={{ color: 'var(--argus-text-primary)' }}>Third-Party Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--argus-text-muted)' }}>Global Override States</h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-primary)' }}>Active Priority Incident</Label>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>Simulate a global P1 incident in progress.</p>
                </div>
                <Switch checked={formData.active_incident} onCheckedChange={(c: boolean) => setFormData({...formData, active_incident: c})} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium" style={{ color: 'var(--argus-text-primary)' }}>Engineering Change Freeze</Label>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--argus-text-muted)' }}>Simulate holiday/weekend freeze state.</p>
                </div>
                <Switch checked={formData.change_freeze_active} onCheckedChange={(c: boolean) => setFormData({...formData, change_freeze_active: c})} />
              </div>
            </div>

            <Button
              onClick={handleSimulate}
              disabled={mutation.isPending || !formData.description}
              className="w-full gradient-btn font-semibold border-0 text-white h-11"
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Pipeline...</> : <><Play className="w-4 h-4 mr-2 fill-current" />Run Simulation</>}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: PIPELINE RESULTS */}
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden h-full flex flex-col" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
              <GitMerge size={15} style={{ color: 'var(--argus-indigo)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Pipeline Execution Trace</span>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <AnimatePresence mode="wait">
              {!mutation.data && !mutation.isPending ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center text-center py-16"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--argus-indigo-light)' }}>
                    <Play size={22} style={{ color: 'var(--argus-indigo)' }} />
                  </div>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--argus-text-muted)' }}>Configure parameters and run the simulation to trace the Argus decision pipeline.</p>
                </motion.div>
              ) : mutation.isPending ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-3"
                >
                  <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--argus-indigo)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--argus-indigo)' }}>Running Neural Rules Engine...</p>
                </motion.div>
              ) : mutation.data ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  {/* Result Banner */}
                  <div className="p-4 rounded-xl border flex items-start gap-3" style={{ background: mutation.data.layer_intercepted === 4 ? 'var(--argus-emerald-light)' : 'var(--argus-amber-light)', borderColor: mutation.data.layer_intercepted === 4 ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)' }}>
                    <ArrowRightCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: mutation.data.layer_intercepted === 4 ? 'var(--argus-emerald)' : 'var(--argus-amber)' }} />
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: mutation.data.layer_intercepted === 4 ? 'var(--argus-emerald)' : 'var(--argus-amber)' }}>
                        {mutation.data.layer_intercepted === 4 ? "Auto-Resolution Successful" : "Escalated to Human Agent"}
                      </h4>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--argus-text-secondary)' }}>{mutation.data.reason}</p>
                    </div>
                  </div>

                  {/* Pipeline Stages */}
                  <div className="space-y-2 relative">
                    <div className="absolute left-5 top-5 bottom-5 w-0.5" style={{ background: 'var(--argus-border)' }} />
                    <div className="relative z-10"><PipelineStage num={1} title="Global Overrides" icon={ShieldAlert} desc="Checks active incidents and change freezes." /></div>
                    <div className="relative z-10"><PipelineStage num={2} title="VIP Hard Gates" icon={AlertCircle} desc="Routes C-Suite or specific severity directly." /></div>
                    <div className="relative z-10"><PipelineStage num={3} title="LLM Signal Check" icon={Cpu} desc="Vector similarity, novelty, and historical confidence." /></div>
                    <div className="relative z-10"><PipelineStage num={4} title="Auto-Resolution" icon={Play} desc="Generates and executes the fix automatically." /></div>
                  </div>

                  {/* Signal Data */}
                  {mutation.data.signals && Object.keys(mutation.data.signals).length > 0 && (
                    <div className="p-4 rounded-xl border" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)' }}>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--argus-text-muted)' }}>Signal Telemetry</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(mutation.data.signals).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-xs truncate" style={{ color: 'var(--argus-text-muted)' }}>{key}</p>
                            <p className="font-mono text-sm font-semibold mt-0.5" style={{ color: 'var(--argus-text-primary)' }}>{(val * 100).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

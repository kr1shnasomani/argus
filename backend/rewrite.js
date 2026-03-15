const fs = require('fs');
const path = '../frontend/src/pages/agent/EvidenceCardView.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /(const renderSignal = [$\s\S]*?)(?=\r?\n\n  return \()/,
  ''
);

const stepperHTML = `\
              {+/* Vertical Pipeline Stepper */}
              <div className="pt-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--argus-text-muted)' }}>Pipeline Execution Trace</h4>
                <div className="relative border-l-2 ml-3 pl-6 space-y-6" style={{ borderColor: 'var(--argus-border)' }}>
                  
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: 'var(--argus-emerald)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--argus-emerald)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Intake & Categorization</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>Ticket parsed as <span style={{ color: 'var(--argus-indigo)' }}>{card.category}</span></p>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: (card.evidence_card?>signals?.semantic_similarity?.passed || card.evidence_card?.is_novel === false) ? 'var(--argus-emerald)' : 'var(--argus-red)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: (card.evidence_card?.signals?.semantic_similarity?.passed || card.evidence_card?.is_novel === false) ? 'var(--argus-emerald)' : 'var(--argus-red)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Vector DB Similarity Check</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      Score: {(card.evidence_card?.signals?.semantic_similarity?.value * 100 || 0).toFixed(1)}% /{hcard.evidence_card?.signals?.semantic_similarity?.threshold * 100 || 90).toFixed(1)}% threshold
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: (card.severity === 'CRITICAL' || card.user_tier === 'VIP') && card.status !== 'auto_resolved' ? 'var(--argus-amber)' : 'var(--argus-emerald)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: (card.severity === 'CRITICAL' || card.user_tier === 'VIP') && card.status !== 'auto_resolved' ? 'var(--argus-amber)' : 'var(--argus-emerald)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={{ color: 'var(--argus-text-primary)' }}>Safety & Tier Gates</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {(card.severity === 'CRITICAL' || card.user_tier === 'VIP') && card.status !== 'auto_resolved' ? 'Escalated due to Tier/Severity policy' : 'Passed safety constraints'}
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 flex items-center justify-center bg-white" style={{ borderColor: card.status === 'auto_resolved' ? 'var(--argus-emerald)' : card.evidence_card?.layer_intercepted === 'sandbox' ? 'var(--argus-red)' : 'var(--argus-border)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: card.status === 'auto_resolved' ? 'var(--argus-emerald)' : card.evidence_card?.layer_intercepted === 'sandbox' ? 'var(--argus-red)' : 'var(--argus-border)' }} />
                    </div>
                    <h5 className="text-sm font-semibold" style={z color: 'var(--argus-text-primary)' }}>Sandbox Execution</h5>
                    <p className="text-xs mt-1" style={{ color: 'var(--argus-text-muted)' }}>
                      {card.status === 'auto_resolved' ? 'Execution passed all validation tests' : card.evidence_card?.layer_intercepted === 'sandbox' ? 'Validation failed during dry-run' : 'Skipped execution'}
                    </p>
                  </div>
                </div>
              </div>`

content = content.replace(
/ \{/* Confidence Signals \*/\}[s\S]*?(?=\{/* Candidate Fixes - preserved */})|{\/\* Confidence Signals \*\/}[s\S]*?(?=\{/* Candidate Fixes \*/\}(/,
  tag => stepperHTML + '\n              '
);

const rightPanelNew = `{/* RIGHT: Resolution Workspace or Agent Audit */}
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
                    <div className="p-4 rounded-xl border text-sm" style={{ background: 'var(--argus-surface-2)', borderColor: 'var(--argus-border)', color: 'var(--argus-text-primary)' }}>
                      {card.evidence_card?.candidate_fixes?.[0]?.resolution || "Agent synthesized a novel response or resolution is unavailable."}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg border flex items-start gap-3" style={{ background: 'rbga(16, 185, 129, 0.05)', borderColor: 'rbga(16, 185, 129, 0.2)' }}>
                    <Activity size={16} className="mt-0.5" style={{ color: 'var(--argus-emerald)' }} />
                    <div>
                      <h4 className="text-xs font-semibold" style={{ color: 'var(--argus-emerald)' }}>Validation Complete</h4>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--argus-text-muted)' }}>
                        Sandbox tests executed successfully. No human intervention was required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) :[${String.fromCharCode(32)}`
;

content = content.replace(
/\{\/\* RIGHT: Resolution Workspace \*\}[s\S]*?(?=<form onSubmit={handleSubmit}>)/,
 rightPanelNew + `
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--argus-surface)', borderColor: 'var(--argus-border)', boxShadow: 'var(--shadow-lg)' }}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--argus-indigo) 0%, #7C3AED 100%)' }} />
              `
);

content = content.replace(
  /<\/form>\s*<\/div>\s *<\/div>\s*<\/div>\s *<\/div>\s*<\/motion.div>/
 , `</form>
              </div>
            }
          </div>
        </div>
      </div>
    </motion.div>` );

fs.writeFileSync(path, content);

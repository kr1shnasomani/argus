import re

with open("/Users/apple/Documents/Projects/argus/frontend/src/pages/agent/EvidenceCardView.tsx", "r") as f:
    content = f.read()

replacements = [
    ("card.signals", "card.evidence_card?.signals"),
    ("card.escalation_reason", "card.evidence_card?.escalation_reason"),
    ("card.is_novel", "card.evidence_card?.is_novel"),
    ("card.candidate_fixes", "card.evidence_card?.candidate_fixes"),
    ("card.layer_intercepted", "card.evidence_card?.layer_intercepted"),
    ("card.total_latency_ms", "card.decision_latency_ms")
]

for old, new in replacements:
    content = content.replace(old, new)

content = re.sub(
    r'\{\/\* Escalation Alert \*\/\}.*?(?=\{\/\* Confidence Signals \*\/\})',
    r"""{/* Outcome Alert */}
              {card.status === "auto_resolved" ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--argus-emerald)' }} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--argus-emerald)' }}>Successfully Auto-Resolved</h4>
                    <p className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>Agent completed the request and passed sandbox validation.</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--argus-text-muted)' }}>Sandbox Output: {card.evidence_card?.sandbox_passed ? 'Tests Passed' : 'Unknown'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: 'var(--argus-amber-light)', borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--argus-amber)' }} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--argus-amber)' }}>Human Escalation Triggered</h4>
                    <p className="text-sm" style={{ color: 'var(--argus-text-secondary)' }}>{card.evidence_card?.escalation_reason || "Unknown reason"}</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--argus-text-muted)' }}>Pipeline halted at Layer {card.evidence_card?.layer_intercepted || "N/A"}</p>
                  </div>
                </div>
              )}

              """,
    content,
    flags=re.DOTALL
)

with open("/Users/apple/Documents/Projects/argus/frontend/src/pages/agent/EvidenceCardView.tsx", "w") as f:
    f.write(content)

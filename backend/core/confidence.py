from typing import List, Dict, Any
from collections import Counter
from models.confidence import GateResult, GateAction, SignalResult, ConfidenceReport, SignalStatus, ConfidenceDecision

def compute_confidence(
    qdrant_results: List[Any], 
    category: str, 
    supabase_client, 
    cluster_map: Dict[str, str]
) -> ConfidenceReport:
    """
    Layer 3: Confidence Engine.
    Evaluates three distinct signals to determine if an AI resolution is safe.
    qdrant_results: list of Qdrant ScoredPoint objects.
    supabase_client: initialized supabase_client or a mocked object with necessary methods.
    cluster_map: dictionary mapping resolution texts to cluster IDs.
    """
    # Fetch thresholds for this category
    thresholds = supabase_client.get_category_thresholds(category)
    if not thresholds:
        # Fallback to defaults
        thresholds = {
            "threshold_a": 0.75,
            "threshold_b": 0.60,
            "threshold_c": 0.70,
            "min_sample_size": 30
        }

    # Signal A: Target Relevance (Max Similarity)
    # Assumes qdrant_results is already sorted by score desc (default for vector search)
    score_a = qdrant_results[0].score if qdrant_results else 0.0
    passed_a = score_a >= thresholds["threshold_a"]
    signal_a = SignalResult(
        name="Signal A: Semantic Relevance",
        score=score_a,
        threshold=thresholds["threshold_a"],
        result=SignalStatus.PASS if passed_a else SignalStatus.FAIL
    )

    # Determine if top result is agent-verified (used as override trigger for B and C)
    from utils.cluster_map import get_resolution_cluster
    
    total_results = len(qdrant_results)
    top_result_verified = (
        qdrant_results[0].payload.get("verified", False) 
        if qdrant_results and hasattr(qdrant_results[0], "payload") and qdrant_results[0].payload 
        else False
    )
    # Agent-verified override: if Signal A >= 0.95 AND top result is agent-verified,
    # the system has learned from a human expert — trust it unconditionally for B and C.
    agent_verified_override = score_a >= 0.95 and top_result_verified

    # Signal B: Cohort Consensus
    # Find the most common resolution cluster among the top k results.
    if total_results > 0:
        clusters = []
        for res in qdrant_results:
            res_text = res.payload.get("resolution", "") if hasattr(res, "payload") and res.payload else ""
            cluster = get_resolution_cluster(res_text, cluster_map)
            clusters.append(cluster)
            
        counter = Counter(clusters)
        most_common_cluster, count = counter.most_common(1)[0]
        score_b = count / total_results
        
        # Override: agent-verified high-similarity match → boost to full consensus
        if agent_verified_override:
            score_b = max(score_b, 1.0)
    else:
        score_b = 0.0

    passed_b = score_b >= thresholds["threshold_b"]
    signal_b = SignalResult(
        name="Signal B: Cohort Consensus",
        score=score_b,
        threshold=thresholds["threshold_b"],
        result=SignalStatus.PASS if passed_b else SignalStatus.FAIL
    )

    # Signal C: Historical Category Success
    # We query the past 30 days of outcomes for this category
    history = supabase_client.get_ticket_history(category, days=30)
    total_historical = len(history) if history else 0
    
    if agent_verified_override:
        # Override: an agent personally verified this exact resolution at >=95% similarity.
        # The system has learned from a human expert — Signal C is superseded by that ground truth.
        # Report the real historical score for transparency but force a PASS.
        if total_historical > 0:
            auto_resolved_count = sum(1 for h in history if h.get("auto_resolved") == True)
            score_c = auto_resolved_count / total_historical
        else:
            score_c = 0.80  # no history yet
        signal_c = SignalResult(
            name="Signal C: Historical Success",
            score=score_c,
            threshold=thresholds["threshold_c"],
            result=SignalStatus.PASS  # overridden by agent-verified trust
        )
    elif total_historical == 0:
        # Cold start: no historical data — be lenient and pass Signal C
        score_c = 0.80  # Assume optimistic baseline for new categories
        signal_c = SignalResult(
            name="Signal C: Historical Success",
            score=score_c,
            threshold=thresholds["threshold_c"],
            result=SignalStatus.PASS
        )
    elif total_historical < thresholds["min_sample_size"]:
        # Limited historical data (1-29 records): score based on available data
        auto_resolved_count = sum(1 for h in history if h.get("auto_resolved") == True)
        score_c = auto_resolved_count / total_historical if total_historical > 0 else 0.0
        passed_c = score_c >= thresholds["threshold_c"]
        signal_c = SignalResult(
            name="Signal C: Historical Success",
            score=score_c,
            threshold=thresholds["threshold_c"],
            result=SignalStatus.PASS if passed_c else SignalStatus.FAIL
        )
    else:
        # Sufficient historical data (>= min_sample_size)
        auto_resolved_count = sum(1 for h in history if h.get("auto_resolved") == True)
        score_c = auto_resolved_count / total_historical
        passed_c = score_c >= thresholds["threshold_c"]
        signal_c = SignalResult(
            name="Signal C: Historical Success",
            score=score_c,
            threshold=thresholds["threshold_c"],
            result=SignalStatus.PASS if passed_c else SignalStatus.FAIL
        )

    # Veto Gate
    signals = {"A": signal_a, "B": signal_b, "C": signal_c}
    failed = {k: v for k, v in signals.items() if v.result == SignalStatus.FAIL}
    
    is_confident = len(failed) == 0
    decision = ConfidenceDecision.CANARY if is_confident else ConfidenceDecision.ESCALATE

    reason = "All signals passed."
    if agent_verified_override and not failed:
        reason = "All signals passed. Signal B and C overridden by agent-verified high-similarity match (Signal A >= 0.95)."
    elif failed:
        reason = "Veto gate triggered by a failing signal."
    
    return ConfidenceReport(
        decision=decision,
        signals=signals,
        failed=failed,
        reason=reason
    )

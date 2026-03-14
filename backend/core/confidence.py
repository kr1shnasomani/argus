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
        # Fallback to defaults or fail-safe escalate
        thresholds = {
            "threshold_a": 0.85,
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

    # Signal B: Cohort Consensus
    # Find the most common resolution cluster among the top k results
    from utils.cluster_map import get_resolution_cluster
    
    total_results = len(qdrant_results)
    if total_results > 0:
        clusters = []
        for res in qdrant_results:
            # Assuming payload contains 'resolution'
            res_text = res.payload.get("resolution", "") if hasattr(res, "payload") and res.payload else ""
            cluster = get_resolution_cluster(res_text, cluster_map)
            clusters.append(cluster)
            
        counter = Counter(clusters)
        most_common_cluster, count = counter.most_common(1)[0]
        score_b = count / total_results
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
    
    if total_historical < thresholds["min_sample_size"]:
        # Cold start fail
        score_c = 0.0
        passed_c = False
        signal_c = SignalResult(
            name="Signal C: Historical Success",
            score=score_c,
            threshold=thresholds["threshold_c"],
            result=SignalStatus.FAIL
        )
        signal_c_reason = "Failed due to cold start (< min_sample_size tickets)."
    else:
        auto_resolved = sum(1 for h in history if h.get("outcome") == "verified")
        score_c = auto_resolved / total_historical
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
    
    return ConfidenceReport(
        decision=decision,
        signals=signals,
        failed=failed,
        reason="Veto gate triggered by a failing signal." if failed else "All signals passed."
    )

import { Candidate, MatchingPrefs } from '../types';
import { apply_rule as nameSimilarity } from '../rules/name_similarity';
import { apply_rule as refMatch } from '../rules/ref_match';
import { apply_rule as partialPayments } from '../rules/partial_payments';
import { applyDelta } from '../confidence';

/**
 * Scoring stage.
 * Runs the non‑filtering rules on each candidate, adjusting the
 * confidence and extending the rule trace.
 * Confidence is always kept within [0, 1].
 */
export function score_candidates(
    candidates: Candidate[],
    prefs: MatchingPrefs
): Candidate[] {
    return candidates.map((c) => {
        const { transaction, document } = c;
        const traces = [...c.rule_trace];

        // Name similarity – weak boost.
        const nameRes = nameSimilarity(transaction, document, prefs);
        traces.push(...nameRes.trace);
        let confidence = applyDelta(c.confidence, nameRes.confidenceDelta);

        // Reference match – strong boost.
        const refRes = refMatch(transaction, document, prefs);
        traces.push(...refRes.trace);
        confidence = applyDelta(confidence, refRes.confidenceDelta);

        // Partial payments – may reject or keep ambiguous.
        const partRes = partialPayments(transaction, document, prefs);
        traces.push(...partRes.trace);
        confidence = applyDelta(confidence, partRes.confidenceDelta);

        return {
            transaction,
            document,
            confidence,
            rule_trace: traces,
        };
    });
}
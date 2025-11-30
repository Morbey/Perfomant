import {
    Candidate,
    MatchingPrefs,
    MatchedPair,
    AmbiguousMatch,
    ReconciliationOutput,
} from '../types';

/**
 * Classification stage.
 * Uses the thresholds from MatchingPrefs to decide which candidates become
 * definitive matches, which are ambiguous, and which remain unmatched.
 */
export function classify_results(
    candidates: Candidate[],
    prefs: MatchingPrefs,
    allTxIds: string[],
    allDocIds: string[]
): ReconciliationOutput {
    const matchedPairs: MatchedPair[] = [];
    const ambiguousMatches: AmbiguousMatch[] = [];

    // Index candidates by transaction id for easy lookup.
    const byTx: Record<string, Candidate[]> = {};
    for (const cand of candidates) {
        const txId = cand.transaction.transaction_id;
        if (!byTx[txId]) byTx[txId] = [];
        byTx[txId].push(cand);
    }

    const usedDocuments = new Set<string>();
    const usedTransactions = new Set<string>();

    for (const txId in byTx) {
        const txCandidates = byTx[txId]
            .filter((c) => c.confidence >= (prefs.min_confidence_candidate ?? 0))
            .sort((a, b) => b.confidence - a.confidence); // highest confidence first

        if (txCandidates.length === 0) {
            // No candidate above the candidate threshold → unmatched transaction.
            continue;
        }

        const top = txCandidates[0];
        const isAutoMatch =
            top.confidence >= (prefs.min_confidence_auto_match ?? 1);

        if (isAutoMatch && txCandidates.length === 1) {
            // Unique strong candidate → definitive match.
            matchedPairs.push({
                transaction_ids: [top.transaction.transaction_id],
                document_ids: [top.document.document_id],
                confidence: top.confidence,
                rule_trace: top.rule_trace,
            });
            usedTransactions.add(top.transaction.transaction_id);
            usedDocuments.add(top.document.document_id);
        } else {
            // Ambiguous situation (multiple strong candidates or below auto threshold).
            const ambiguousDocs = txCandidates.map((c) => ({
                document_id: c.document.document_id,
                confidence: c.confidence,
                rule_trace: c.rule_trace,
            }));
            ambiguousMatches.push({
                transaction_ids: [txId],
                candidate_documents: ambiguousDocs,
                reason:
                    txCandidates.length > 1
                        ? 'Multiple strong candidates'
                        : 'Confidence below auto‑match threshold',
            });
            usedTransactions.add(txId);
            ambiguousDocs.forEach((d) => usedDocuments.add(d.document_id));
        }
    }

    // Determine unmatched documents (those never used).
    const unmatchedDocuments = allDocIds.filter(
        (id) => !usedDocuments.has(id)
    );

    // Determine unmatched transactions (those never used).
    const unmatchedTransactions = allTxIds.filter(
        (id) => !usedTransactions.has(id)
    );

    // Minimal diagnostics – rules applied are collected from traces.
    const rulesApplied = new Set<string>();
    for (const c of candidates) {
        c.rule_trace.forEach((r) => rulesApplied.add(r));
    }

    const diagnostics = {
        rules_applied: [...rulesApplied],
        metrics: {
            total_transactions: allTxIds.length,
            total_documents: allDocIds.length,
            definitive_matches: matchedPairs.length,
            ambiguous_matches: ambiguousMatches.length,
            unmatched_transactions: unmatchedTransactions.length,
            unmatched_documents: unmatchedDocuments.length,
            // The following are placeholders – full metrics would be computed elsewhere.
            cross_currency_attempts: 0,
            partial_payment_patterns: 0,
        },
        notes: [],
    };

    return {
        summary: {}, // populated later by higher‑level orchestration if needed
        matches: {
            matched_pairs: matchedPairs,
            ambiguous_matches: ambiguousMatches,
            unmatched_transactions: unmatchedTransactions,
            unmatched_documents: unmatchedDocuments,
        },
        diagnostics,
    };
}
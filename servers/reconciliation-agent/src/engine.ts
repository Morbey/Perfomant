import {
    ReconciliationInput,
    ReconciliationOutput,
    MatchingPrefs,
} from './types';
import { generate_candidates } from './pipeline/generate_candidates';
import { score_candidates } from './pipeline/score_candidates';
import { classify_results } from './pipeline/classify_results';

/**
 * Public entry point for the MCP Reconciliation Agent (Phase 2).
 * It wires the three pipeline stages together and returns the full
 * ReconciliationOutput structure.
 */
export function runReconciliationPhase2(
    input: ReconciliationInput
): ReconciliationOutput {
    const prefs: MatchingPrefs = input.matching_prefs ?? {};

    // 1️⃣ Candidate generation (hard filters)
    const rawCandidates = generate_candidates(
        input.bank_side.transactions,
        input.document_side.documents,
        prefs
    );

    // 2️⃣ Scoring (non‑filtering rules)
    const scoredCandidates = score_candidates(rawCandidates, prefs);

    // 3️⃣ Classification (final output)
    const allTxIds = input.bank_side.transactions.map(t => t.transaction_id);
    const allDocIds = input.document_side.documents.map(d => d.document_id);
    const output = classify_results(scoredCandidates, prefs, allTxIds, allDocIds);

    // Attach a minimal summary (could be enriched later).
    output.summary = {
        total_transactions: input.bank_side.transactions.length,
        total_documents: input.document_side.documents.length,
    };

    return output;
}
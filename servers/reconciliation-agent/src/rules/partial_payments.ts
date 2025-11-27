import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const trace = ['PARTIAL_PAYMENTS'];
    // Detect partial payment pattern: transaction amount less than document total amount
    if (transaction.amount != null && document.total_amount != null && transaction.amount < document.total_amount) {
        if (prefs.allow_partial_payments) {
            // Allow as ambiguous candidate, no confidence boost
            return { accept: true, confidenceDelta: 0, trace };
        }
        // Not allowed -> reject
        return { accept: false, confidenceDelta: -0.5, trace };
    }
    // No partial pattern detected, accept by default
    return { accept: true, confidenceDelta: 0, trace };
}

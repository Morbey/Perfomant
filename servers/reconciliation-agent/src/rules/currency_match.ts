import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const trace = ['CURRENCY_MATCH'];
    // If both currencies are defined and differ
    if (transaction.currency && document.currency && transaction.currency !== document.currency) {
        if (prefs.allow_cross_currency) {
            // Allow but apply penalty
            return { accept: true, confidenceDelta: -0.5, trace };
        }
        // Not allowed -> reject
        return { accept: false, confidenceDelta: -0.5, trace };
    }
    // No conflict
    return { accept: true, confidenceDelta: 0, trace };
}

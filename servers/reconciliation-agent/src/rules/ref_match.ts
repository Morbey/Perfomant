import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const trace = ['REF_MATCH'];
    const ref = document.payment_reference?.toLowerCase();
    if (!ref) {
        return { accept: true, confidenceDelta: 0, trace };
    }
    const desc = transaction.description?.toLowerCase() ?? '';
    const counter = transaction.counterparty?.toLowerCase() ?? '';
    const found = desc.includes(ref) || counter.includes(ref);
    const confidenceDelta = found ? 0.5 : 0;
    return { accept: true, confidenceDelta, trace };
}

import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const trace = ['NAME_SIMILARITY'];
    // Simple token overlap between transaction.counterparty and document.issuer_name
    const getTokens = (s?: string | null) =>
        s ? s.toLowerCase().split(/\s+/).filter(Boolean) : [];
    const txnTokens = getTokens(transaction.counterparty);
    const docTokens = getTokens(document.issuer_name);
    const common = txnTokens.filter(t => docTokens.includes(t));
    const overlap = common.length / Math.max(txnTokens.length, 1);
    const accept = overlap > 0;
    const confidenceDelta = accept ? 0.1 : 0;
    return { accept, confidenceDelta, trace };
}

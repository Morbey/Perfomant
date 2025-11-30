import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const accept = transaction.amount === document.total_amount;
    const confidenceDelta = accept ? 0.5 : 0;
    const trace = ['AMOUNT_STRICT'];
    return { accept, confidenceDelta, trace };
}

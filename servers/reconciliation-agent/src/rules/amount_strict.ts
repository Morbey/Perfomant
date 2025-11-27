import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidence_delta: number; trace?: string } {
    // TODO: Implement AMOUNT_STRICT logic
    return { accept: true, confidence_delta: 0 };
}

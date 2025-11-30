import { NormalisedTransaction, NormalisedDocument, MatchingPrefs, Candidate } from '../types';
import { apply_rule as amountStrict } from '../rules/amount_strict';
import { apply_rule as currencyMatch } from '../rules/currency_match';
import { apply_rule as dateWindow } from '../rules/date_window';

/**
 * Hard‑filter stage.
 * Iterates over every transaction‑document pair and applies the
 * mandatory (hard) rules. Only pairs accepted by all three rules are
 * turned into a Candidate with an initial confidence of 0.
 */
export function generate_candidates(
    transactions: NormalisedTransaction[],
    documents: NormalisedDocument[],
    prefs: MatchingPrefs
): Candidate[] {
    const candidates: Candidate[] = [];

    for (const transaction of transactions) {
        for (const document of documents) {
            // Apply hard rules sequentially, collecting trace.
            const traces: string[] = [];
            let confidence = 0;

            const amountRes = amountStrict(transaction, document, prefs);
            traces.push(...amountRes.trace);
            if (!amountRes.accept) continue;
            confidence += amountRes.confidenceDelta;

            const currencyRes = currencyMatch(transaction, document, prefs);
            traces.push(...currencyRes.trace);
            if (!currencyRes.accept) continue;
            confidence += currencyRes.confidenceDelta;

            const dateRes = dateWindow(transaction, document, prefs);
            traces.push(...dateRes.trace);
            if (!dateRes.accept) continue;
            confidence += dateRes.confidenceDelta;

            // All hard filters passed – create candidate.
            candidates.push({
                transaction,
                document,
                confidence,
                rule_trace: traces,
            });
        }
    }

    return candidates;
}
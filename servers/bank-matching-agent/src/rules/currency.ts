// src/rules/currency.ts

import { NormalisedTransaction, Diagnostics, MatchingContext } from "../types";

/**
 * Apply the CURRENCY rule.
 * Flags transactions with currency different from default_currency.
 */
export function applyCurrencyRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics,
    matchingContext?: MatchingContext
) {
    const defaultCurrency = matchingContext?.default_currency;

    // Skip if no default currency is defined
    if (!defaultCurrency || defaultCurrency.trim() === "") {
        return;
    }

    for (const tx of transactions) {
        const hasCurrency = typeof tx.currency === "string" && tx.currency.trim() !== "";
        if (!hasCurrency) continue;

        const currency = tx.currency!.trim();

        if (currency !== defaultCurrency) {
            const id = tx.transaction_id;
            if (typeof id === "string" && id.trim() !== "") {
                diagnostics.transaction_flags[id] = diagnostics.transaction_flags[id] ?? [];
                if (!diagnostics.transaction_flags[id].includes("INCONSISTENT_CURRENCY")) {
                    diagnostics.transaction_flags[id].push("INCONSISTENT_CURRENCY");
                }
            }
        }
    }

    if (!diagnostics.stats.rules_applied.includes("RULE_CURRENCY")) {
        diagnostics.stats.rules_applied.push("RULE_CURRENCY");
    }
}

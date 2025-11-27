// src/rules/outliers.ts

import { NormalisedTransaction, Diagnostics, MatchingContext } from "../types";

/**
 * Calculate median value from a sorted array of numbers.
 */
function calculateMedian(sortedValues: number[]): number {
    const len = sortedValues.length;
    if (len === 0) return 0;
    if (len % 2 === 0) {
        return (sortedValues[len / 2 - 1] + sortedValues[len / 2]) / 2;
    }
    return sortedValues[Math.floor(len / 2)];
}

/**
 * Calculate 90th percentile from a sorted array of numbers.
 */
function calculateP90(sortedValues: number[]): number {
    const len = sortedValues.length;
    if (len === 0) return 0;
    const index = Math.ceil(len * 0.9) - 1;
    return sortedValues[Math.max(0, Math.min(index, len - 1))];
}

/**
 * Apply the OUTLIERS rule.
 * Flags transactions with amounts >= max(p90, median * 3) as VALUE_OUTLIER.
 */
export function applyOutliersRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics,
    matchingContext?: MatchingContext
) {
    const defaultCurrency = matchingContext?.default_currency;

    // Collect eligible amounts
    const eligibleAmounts: number[] = [];
    for (const tx of transactions) {
        const hasAmount = typeof tx.amount === "number" && tx.amount > 0;
        if (!hasAmount) continue;

        const hasCurrency = typeof tx.currency === "string" && tx.currency.trim() !== "";
        const currency = hasCurrency ? tx.currency!.trim() : null;

        // Include if: no currency OR currency matches default (if default is defined)
        if (!currency || !defaultCurrency || currency === defaultCurrency) {
            eligibleAmounts.push(tx.amount!);
        }
    }

    // Skip if fewer than 5 eligible amounts
    if (eligibleAmounts.length < 5) {
        return;
    }

    // Sort amounts for median and p90 calculation
    const sortedAmounts = [...eligibleAmounts].sort((a, b) => a - b);
    const median = calculateMedian(sortedAmounts);
    const p90 = calculateP90(sortedAmounts);
    const threshold = Math.max(p90, median * 3);

    // Flag outliers
    for (const tx of transactions) {
        const hasAmount = typeof tx.amount === "number" && tx.amount > 0;
        if (!hasAmount) continue;

        if (tx.amount! >= threshold) {
            const id = tx.transaction_id;
            if (typeof id === "string" && id.trim() !== "") {
                diagnostics.transaction_flags[id] = diagnostics.transaction_flags[id] ?? [];
                if (!diagnostics.transaction_flags[id].includes("VALUE_OUTLIER")) {
                    diagnostics.transaction_flags[id].push("VALUE_OUTLIER");
                    diagnostics.stats.outlier_transactions += 1;
                }
            }
        }
    }

    // Add note about threshold
    const currencyLabel = defaultCurrency ? ` ${defaultCurrency}` : "";
    diagnostics.notes.push(
        `Outlier threshold set to ${threshold.toFixed(2)}${currencyLabel} (p90=${p90.toFixed(2)}, median=${median.toFixed(2)})`
    );

    if (!diagnostics.stats.rules_applied.includes("RULE_OUTLIERS")) {
        diagnostics.stats.rules_applied.push("RULE_OUTLIERS");
    }
}

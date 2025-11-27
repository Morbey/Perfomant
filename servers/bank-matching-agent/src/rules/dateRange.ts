// src/rules/dateRange.ts

import { NormalisedTransaction, Diagnostics, MatchingContext } from "../types";

/**
 * Apply the DATE_RANGE rule.
 * Flags transactions outside the expected period with DATE_OUT_OF_RANGE.
 */
export function applyDateRangeRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics,
    matchingContext?: MatchingContext
) {
    const expectedPeriod = matchingContext?.expected_period;

    // Skip if no expected period is defined
    if (!expectedPeriod || !expectedPeriod.start || !expectedPeriod.end) {
        return;
    }

    const start = expectedPeriod.start;
    const end = expectedPeriod.end;

    for (const tx of transactions) {
        const hasDate = typeof tx.date === "string" && tx.date.trim() !== "";
        if (!hasDate) continue;

        const date = tx.date!.trim();

        // Lexicographic comparison (works for YYYY-MM-DD format)
        if (date < start || date > end) {
            const id = tx.transaction_id;
            if (typeof id === "string" && id.trim() !== "") {
                diagnostics.transaction_flags[id] = diagnostics.transaction_flags[id] ?? [];
                if (!diagnostics.transaction_flags[id].includes("DATE_OUT_OF_RANGE")) {
                    diagnostics.transaction_flags[id].push("DATE_OUT_OF_RANGE");
                    diagnostics.stats.transactions_out_of_period += 1;
                }
            }
        }
    }

    if (!diagnostics.stats.rules_applied.includes("RULE_DATE_RANGE")) {
        diagnostics.stats.rules_applied.push("RULE_DATE_RANGE");
    }
}

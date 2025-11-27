// src/rules/structural.ts

import { NormalisedTransaction, TransactionFlag, Diagnostics } from "../types";

/**
 * Apply the STRUCTURAL rule.
 * Transactions missing ALL of transaction_id, amount (positive), and date are considered
 * structural issues and are dropped from the prepared list.
 *
 * The function returns the kept transactions, the dropped ones, and updates to diagnostics.
 */
export function applyStructuralRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics
) {
    const kept: NormalisedTransaction[] = [];
    const dropped: NormalisedTransaction[] = [];

    for (const tx of transactions) {
        const hasId = typeof tx.transaction_id === "string" && tx.transaction_id.trim() !== "";
        const hasAmount = typeof tx.amount === "number" && tx.amount > 0;
        const hasDate = typeof tx.date === "string" && tx.date.trim() !== "";

        // Structural issue if ALL three are missing/invalid
        if (!hasId && !hasAmount && !hasDate) {
            dropped.push(tx);
        } else {
            kept.push(tx);
        }
    }

    // Update stats
    diagnostics.stats.dropped_transactions += dropped.length;
    diagnostics.stats.kept_transactions = kept.length;
    diagnostics.stats.total_transactions = transactions.length;
    // Ensure the rule is recorded as applied
    if (!diagnostics.stats.rules_applied.includes("RULE_STRUCTURAL")) {
        diagnostics.stats.rules_applied.push("RULE_STRUCTURAL");
    }

    return { kept, dropped };
}

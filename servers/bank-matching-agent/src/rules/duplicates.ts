// src/rules/duplicates.ts

import { NormalisedTransaction, TransactionFlag, Diagnostics, DuplicateCluster } from "../types";

/**
 * Apply the DUPLICATES rule.
 * Considers transactions with non-null date, positive amount, and non-empty direction.
 * Groups by date, amount, direction, and optionally currency (if both have a non‑empty value).
 * For each group of size >= 2, flags each transaction as DUPLICATE_CANDIDATE and creates a DuplicateCluster.
 */
export function applyDuplicatesRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics
) {
    // First, group by the mandatory fields (date, amount, direction, currency)
    const baseGroups: Record<string, NormalisedTransaction[]> = {};

    for (const tx of transactions) {
        const hasDate = typeof tx.date === "string" && tx.date.trim() !== "";
        const hasAmount = typeof tx.amount === "number" && tx.amount > 0;
        const hasDirection = typeof tx.direction === "string" && tx.direction.trim() !== "";
        const hasCurrency = typeof tx.currency === "string" && tx.currency.trim() !== "";
        if (!hasDate || !hasAmount || !hasDirection || !hasCurrency) continue;

        const keyBase = `${tx.date!.trim()}|${tx.amount!}|${tx.direction!.trim()}|${tx.currency!.trim()}`;
        if (!baseGroups[keyBase]) baseGroups[keyBase] = [];
        baseGroups[keyBase].push(tx);
    }

    // Now process each base group, optionally splitting by currency when appropriate
    for (const keyBase of Object.keys(baseGroups)) {
        const group = baseGroups[keyBase];
        if (group.length < 2) continue;

        const reason = "Matched on date+amount+direction+currency";

        const txIds: string[] = [];
        for (const tx of group) {
            if (typeof tx.transaction_id === "string" && tx.transaction_id.trim() !== "") {
                const id = tx.transaction_id;
                txIds.push(id);
                diagnostics.transaction_flags[id] = diagnostics.transaction_flags[id] ?? [];
                if (!diagnostics.transaction_flags[id].includes("DUPLICATE_CANDIDATE")) {
                    diagnostics.transaction_flags[id].push("DUPLICATE_CANDIDATE");
                }
            }
        }

        if (txIds.length > 0) {
            const cluster: DuplicateCluster = {
                transaction_uuids: txIds,
                reason,
            };
            diagnostics.duplicate_clusters.push(cluster);
        }
    }

    // Update stats for duplicate candidates
    const duplicateCount = Object.values(diagnostics.transaction_flags).reduce(
        (sum, flags) => sum + (flags.includes("DUPLICATE_CANDIDATE") ? 1 : 0),
        0
    );
    diagnostics.stats.duplicate_candidates = duplicateCount;

    if (!diagnostics.stats.rules_applied.includes("RULE_DUPLICATES")) {
        diagnostics.stats.rules_applied.push("RULE_DUPLICATES");
    }
}

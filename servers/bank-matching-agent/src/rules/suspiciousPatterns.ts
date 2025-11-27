// src/rules/suspiciousPatterns.ts

import { NormalisedTransaction, Diagnostics } from "../types";

/**
 * Generic description tokens that indicate vague/generic descriptions.
 */
const GENERIC_TOKENS = ["transfer", "payment", "movement", "transaction", "debit", "credit"];

/**
 * Check if a description is generic/vague.
 */
function isGenericDescription(description: string): boolean {
    const normalized = description.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    // If description has only generic tokens and no specific identifiers
    const hasOnlyGenericWords = words.every(word =>
        GENERIC_TOKENS.includes(word) || word.length <= 2 || /^\d+$/.test(word)
    );

    return hasOnlyGenericWords && words.length <= 3;
}

/**
 * Parse date string to milliseconds for date comparisons.
 */
function parseDate(dateStr: string): number {
    return new Date(dateStr).getTime();
}

/**
 * Apply the SUSPICIOUS_PATTERNS rule.
 * Detects:
 * 1. Repeated transfers: >= 3 transactions with same counterparty/direction/amount within 7 days
 * 2. Large vague descriptions: VALUE_OUTLIER + generic description
 */
export function applySuspiciousPatternsRule(
    transactions: NormalisedTransaction[],
    diagnostics: Diagnostics
) {
    const flaggedIds = new Set<string>();

    // Pattern 1: Repeated transfers
    const groups: Record<string, NormalisedTransaction[]> = {};

    for (const tx of transactions) {
        const hasCounterparty = typeof tx.counterparty === "string" && tx.counterparty.trim() !== "";
        const hasDirection = typeof tx.direction === "string" && tx.direction.trim() !== "";
        const hasAmount = typeof tx.amount === "number" && tx.amount > 0;
        const hasDate = typeof tx.date === "string" && tx.date.trim() !== "";

        if (!hasCounterparty || !hasDirection || !hasAmount || !hasDate) continue;

        const key = `${tx.counterparty!.trim()}|${tx.direction!.trim()}|${tx.amount!}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
    }

    // Check each group for repeated patterns within 7 days
    for (const key of Object.keys(groups)) {
        const group = groups[key];
        if (group.length < 3) continue;

        // Sort by date
        const sorted = group
            .filter(tx => tx.date)
            .sort((a, b) => a.date!.localeCompare(b.date!));

        // Check for rolling 7-day window with >= 3 transactions
        for (let i = 0; i < sorted.length; i++) {
            const startDate = parseDate(sorted[i].date!);
            let count = 1;
            const windowTxs = [sorted[i]];

            for (let j = i + 1; j < sorted.length; j++) {
                const currentDate = parseDate(sorted[j].date!);
                const daysDiff = (currentDate - startDate) / (1000 * 60 * 60 * 24);

                if (daysDiff <= 7) {
                    count++;
                    windowTxs.push(sorted[j]);
                } else {
                    break;
                }
            }

            if (count >= 3) {
                // Flag all transactions in this window
                for (const tx of windowTxs) {
                    const id = tx.transaction_id;
                    if (typeof id === "string" && id.trim() !== "") {
                        flaggedIds.add(id);
                    }
                }
            }
        }
    }

    // Pattern 2: Large vague descriptions
    for (const tx of transactions) {
        const id = tx.transaction_id;
        if (typeof id !== "string" || id.trim() === "") continue;

        const hasValueOutlier = diagnostics.transaction_flags[id]?.includes("VALUE_OUTLIER");
        const hasDescription = typeof tx.description === "string" && tx.description.trim() !== "";

        if (hasValueOutlier && hasDescription) {
            if (isGenericDescription(tx.description!)) {
                flaggedIds.add(id);
            }
        }
    }

    // Apply flags
    for (const id of flaggedIds) {
        diagnostics.transaction_flags[id] = diagnostics.transaction_flags[id] ?? [];
        if (!diagnostics.transaction_flags[id].includes("SUSPICIOUS_PATTERN")) {
            diagnostics.transaction_flags[id].push("SUSPICIOUS_PATTERN");
        }
    }

    diagnostics.stats.suspicious_movements = flaggedIds.size;

    if (!diagnostics.stats.rules_applied.includes("RULE_SUSPICIOUS_PATTERNS")) {
        diagnostics.stats.rules_applied.push("RULE_SUSPICIOUS_PATTERNS");
    }
}

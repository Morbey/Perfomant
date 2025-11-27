import { BankMatchingInput, BankMatchingOutput, Diagnostics } from './types';
import { applyStructuralRule } from './rules/structural';
import { applyDuplicatesRule } from './rules/duplicates';
import { applyDateRangeRule } from './rules/dateRange';
import { applyCurrencyRule } from './rules/currency';
import { applyOutliersRule } from './rules/outliers';
import { applySuspiciousPatternsRule } from './rules/suspiciousPatterns';

export * from './types';

/**
 * Runs Phase 1 of the Bank Matching Agent logic: Ingestion & Diagnostics.
 *
 * @param input The input containing transactions and matching context.
 * @returns The output containing prepared transactions and diagnostics.
 */
export function runBankMatchingPhase1(input: BankMatchingInput): BankMatchingOutput {
    if (!Array.isArray(input.transactions)) {
        throw new Error("Invalid input: transactions must be an array.");
    }

    // Initialise diagnostics
    const diagnostics: Diagnostics = {
        transaction_flags: {},
        duplicate_clusters: [],
        stats: {
            total_transactions: input.transactions.length,
            kept_transactions: 0,
            dropped_transactions: 0,
            duplicate_candidates: 0,
            outlier_transactions: 0,
            transactions_out_of_period: 0,
            suspicious_movements: 0,
            rules_applied: []
        },
        notes: []
    };

    // Apply STRUCTURAL rule
    const { kept: structuralKept } = applyStructuralRule(input.transactions, diagnostics);

    // Apply DUPLICATES rule on the kept transactions
    applyDuplicatesRule(structuralKept, diagnostics);

    // Apply DATE_RANGE rule
    applyDateRangeRule(structuralKept, diagnostics, input.matching_context);

    // Apply CURRENCY rule
    applyCurrencyRule(structuralKept, diagnostics, input.matching_context);

    // Apply OUTLIERS rule
    applyOutliersRule(structuralKept, diagnostics, input.matching_context);

    // Apply SUSPICIOUS_PATTERNS rule (must run after OUTLIERS)
    applySuspiciousPatternsRule(structuralKept, diagnostics);

    const prepared_transactions = structuralKept;

    return { prepared_transactions, diagnostics };
}

/**
 * Represents a normalized transaction, aligned with finance-normalizer but decoupled.
 */
export interface NormalisedTransaction {
    transaction_id: string;
    date: string | null;
    amount: number | null;
    direction?: 'credit' | 'debit' | string | null;
    currency?: string | null;
    description?: string | null;
    counterparty?: string | null;
    raw_source_file?: string | null;
    raw_line_number?: number | null;
    normalisation_notes?: string[] | null;
    [key: string]: unknown;
}

/**
 * Context provided for the matching process.
 */
export interface MatchingContext {
    expected_period?: {
        start: string; // YYYY-MM-DD
        end: string;   // YYYY-MM-DD
    };
    default_currency?: string;
}

/**
 * Input for the bank matching agent Phase 1.
 */
export interface BankMatchingInput {
    transactions: NormalisedTransaction[];
    matching_context?: MatchingContext;
}

/**
 * Diagnostic flags for transactions.
 */
export type TransactionFlag =
    | 'DUPLICATE_CANDIDATE'
    | 'DATE_OUT_OF_RANGE'
    | 'VALUE_OUTLIER'
    | 'SUSPICIOUS_PATTERN'
    | 'INCONSISTENT_CURRENCY'

/**
 * Cluster of potential duplicate transactions.
 */
export interface DuplicateCluster {
    transaction_uuids: string[];
    reason: string;
}

/**
 * Statistics about the diagnostics process.
 */
export interface DiagnosticsStats {
    total_transactions: number;
    kept_transactions: number;
    dropped_transactions: number;
    duplicate_candidates: number;
    outlier_transactions: number;
    transactions_out_of_period: number;
    suspicious_movements: number;
    rules_applied: string[];
}

/**
 * Diagnostics output containing flags, clusters, stats, and notes.
 */
export interface Diagnostics {
    transaction_flags: Record<string, TransactionFlag[]>;
    duplicate_clusters: DuplicateCluster[];
    stats: DiagnosticsStats;
    notes: string[];
}

/**
 * Output of the bank matching agent Phase 1.
 */
export interface BankMatchingOutput {
    prepared_transactions: NormalisedTransaction[];
    diagnostics: Diagnostics;
}

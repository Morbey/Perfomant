export type TransactionDirection = 'credit' | 'debit';

export interface NormalisedTransaction {
    /**
     * Unique identifier for the transaction (UUID v4).
     */
    transaction_id: string;

    /**
     * ISO 8601 date string (YYYY-MM-DD) or null if parsing fails.
     */
    date: string | null;

    /**
     * Absolute amount of the transaction (always positive).
     */
    amount: number;

    /**
     * Direction of the transaction: 'credit' (money in) or 'debit' (money out).
     */
    direction: TransactionDirection;

    /**
     * Name of the other party involved in the transaction.
     */
    counterparty?: string | null;

    /**
     * Description or label of the transaction.
     */
    description: string;

    /**
     * Currency code (ISO 4217, e.g., 'EUR').
     */
    currency: string;

    /**
     * ID of the raw source file or record (optional).
     */
    raw_source_id?: string;

    // --- Metadata fields ---

    raw_source_file?: string;
    raw_line_number?: number;
    normalisation_notes?: string[];
}

export interface BankCommissionLine {
    id: string;
    date: string | null;
    description: string;
    taxType?: string;
    baseAmount: number;
    taxRate?: number | null;
    taxAmount?: number;
    totalAmount: number;
    currency: string;
    raw_source_file?: string;
    raw_line_number?: number;
    normalisation_notes?: string[];
}

export interface NormalizationOptions {
    sourceFile?: string;
    defaultCurrency?: string;
    bankProfile?: string; // e.g. "CGD"
}

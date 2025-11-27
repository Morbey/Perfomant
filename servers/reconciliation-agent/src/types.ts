export type NormalisedTransaction = {
    transaction_id: string;
    date?: string | null;
    amount?: number | null;
    direction?: string | null;
    currency?: string | null;
    description?: string | null;
    counterparty?: string | null;
    normalisation_notes?: string[] | null;
    raw_source_file?: string | null;
    raw_line_number?: number | null;
    [key: string]: unknown;
};

export type NormalisedDocument = {
    document_id: string;
    document_type: string;
    issuer_name?: string | null;
    issuer_tax_id?: string | null;
    issue_date?: string | null;
    due_date?: string | null;
    total_amount: number;
    currency?: string | null;
    status?: string | null;
    payment_reference?: string | null;
    raw_source_id?: string | null;
    [key: string]: unknown;
};

export type MatchingPrefs = {
    date_tolerance_days?: number;
    pre_issue_grace_days?: number;
    post_due_grace_days?: number;
    min_confidence_auto_match?: number;
    min_confidence_candidate?: number;
    allow_cross_currency?: boolean;
    allow_partial_payments?: boolean;
};

export type ReconciliationInput = {
    bank_side: {
        transactions: NormalisedTransaction[];
        diagnostics: any;
        context: {
            default_currency?: string;
            statement_period?: {
                start: string;
                end: string;
            };
        };
    };
    document_side: {
        documents: NormalisedDocument[];
        context: {
            default_currency?: string;
        };
    };
    matching_prefs: MatchingPrefs;
};

export type Candidate = {
    transaction: NormalisedTransaction;
    document: NormalisedDocument;
    confidence: number;
    rule_trace: string[];
};

export type MatchedPair = {
    transaction_ids: string[];
    document_ids: string[];
    confidence: number;
    rule_trace: string[];
};

export type AmbiguousMatch = {
    transaction_ids: string[];
    candidate_documents: {
        document_id: string;
        confidence: number;
        rule_trace: string[];
    }[];
    reason: string;
};

export type ReconciliationOutput = {
    summary: any;
    matches: {
        matched_pairs: MatchedPair[];
        ambiguous_matches: AmbiguousMatch[];
        unmatched_transactions: string[];
        unmatched_documents: string[];
    };
    diagnostics: {
        rules_applied: string[];
        metrics: Record<string, number>;
        notes: string[];
    };
};

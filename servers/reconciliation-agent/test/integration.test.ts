/**
 * End‑to‑end integration test exercising the full engine.
 * Scenario includes:
 *   • One perfect match
 *   • One ambiguous match (two candidate documents)
 *   • One transaction without a document
 *   • One document without a transaction
 */

import { runReconciliationPhase2 } from '../src/engine';
import {
    NormalisedTransaction,
    NormalisedDocument,
    MatchingPrefs,
    ReconciliationInput,
} from '../src/types';

const prefs: MatchingPrefs = {
    date_tolerance_days: 3,
    pre_issue_grace_days: 0,
    post_due_grace_days: 7,
    min_confidence_auto_match: 0.9,
    min_confidence_candidate: 0.5,
    allow_cross_currency: false,
    allow_partial_payments: false,
};

const txPerfect: NormalisedTransaction = {
    transaction_id: 'perfect',
    amount: 100,
    date: '2025-01-12',
    direction: null,
    currency: 'EUR',
    description: 'Invoice REF001',
    counterparty: 'Acme Corp',
    normalisation_notes: null,
    raw_source_file: null,
    raw_line_number: null,
};

const txAmbig1: NormalisedTransaction = {
    transaction_id: 'ambig',
    amount: 200,
    date: '2025-01-20',
    direction: null,
    currency: 'EUR',
    description: 'Payment',
    counterparty: 'Beta Ltd',
    normalisation_notes: null,
    raw_source_file: null,
    raw_line_number: null,
};

const txNoDoc: NormalisedTransaction = {
    transaction_id: 'nodoc',
    amount: 300,
    date: '2025-01-25',
    direction: null,
    currency: 'EUR',
    description: 'Unmatched',
    counterparty: 'Gamma LLC',
    normalisation_notes: null,
    raw_source_file: null,
    raw_line_number: null,
};

const docPerfect: NormalisedDocument = {
    document_id: 'docPerfect',
    document_type: 'invoice',
    total_amount: 100,
    issue_date: '2025-01-10',
    due_date: null,
    issuer_name: 'Acme Corporation',
    issuer_tax_id: null,
    status: null,
    payment_reference: 'REF001',
    raw_source_id: null,
};

const docAmbigA: NormalisedDocument = {
    document_id: 'docAmbigA',
    document_type: 'invoice',
    total_amount: 200,
    issue_date: '2025-01-18',
    due_date: null,
    issuer_name: 'Beta Ltd',
    issuer_tax_id: null,
    status: null,
    payment_reference: null,
    raw_source_id: null,
};

const docAmbigB: NormalisedDocument = {
    document_id: 'docAmbigB',
    document_type: 'invoice',
    total_amount: 200,
    issue_date: '2025-01-19',
    due_date: null,
    issuer_name: 'Beta Ltd',
    issuer_tax_id: null,
    status: null,
    payment_reference: null,
    raw_source_id: null,
};

const docOrphan: NormalisedDocument = {
    document_id: 'orphan',
    document_type: 'invoice',
    total_amount: 400,
    issue_date: '2025-01-30',
    due_date: null,
    issuer_name: 'Delta Inc',
    issuer_tax_id: null,
    status: null,
    payment_reference: null,
    raw_source_id: null,
};

const input: ReconciliationInput = {
    bank_side: {
        transactions: [txPerfect, txAmbig1, txNoDoc],
        diagnostics: {},
        context: { default_currency: 'EUR' },
    },
    document_side: {
        documents: [docPerfect, docAmbigA, docAmbigB, docOrphan],
        context: { default_currency: 'EUR' },
    },
    matching_prefs: prefs,
};

describe('Full reconciliation integration', () => {
    test('produces expected match sets', () => {
        const result = runReconciliationPhase2(input);

        // 1️⃣ perfect match
        expect(result.matches.matched_pairs).toHaveLength(1);
        const perfect = result.matches.matched_pairs[0];
        expect(perfect.transaction_ids).toEqual(['perfect']);
        expect(perfect.document_ids).toEqual(['docPerfect']);

        // 2️⃣ ambiguous match (two candidates for the same transaction)
        expect(result.matches.ambiguous_matches).toHaveLength(1);
        const ambig = result.matches.ambiguous_matches[0];
        expect(ambig.transaction_ids).toEqual(['ambig']);
        expect(ambig.candidate_documents).toHaveLength(2);
        const docIds = ambig.candidate_documents.map((d) => d.document_id);
        expect(docIds).toContain('docAmbigA');
        expect(docIds).toContain('docAmbigB');

        // 3️⃣ transaction without a document
        expect(result.matches.unmatched_transactions).toContain('nodoc');

        // 4️⃣ document without a transaction
        expect(result.matches.unmatched_documents).toContain('orphan');
    });
});
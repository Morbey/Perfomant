/**
 * Unit tests for each reconciliation rule.
 * One success case and one failure case per rule.
 */

import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../src/types';
import { apply_rule as amountStrict } from '../src/rules/amount_strict';
import { apply_rule as currencyMatch } from '../src/rules/currency_match';
import { apply_rule as dateWindow } from '../src/rules/date_window';
import { apply_rule as refMatch } from '../src/rules/ref_match';
import { apply_rule as nameSimilarity } from '../src/rules/name_similarity';
import { apply_rule as partialPayments } from '../src/rules/partial_payments';

const defaultPrefs: MatchingPrefs = {
    date_tolerance_days: 3,
    pre_issue_grace_days: 0,
    post_due_grace_days: 7,
    min_confidence_auto_match: 0.9,
    min_confidence_candidate: 0.5,
    allow_cross_currency: false,
    allow_partial_payments: false,
};

describe('AMOUNT_STRICT', () => {
    test('accepts when amounts are equal', () => {
        const tx: NormalisedTransaction = { transaction_id: 't1', amount: 100, date: null, direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd1', document_type: 'invoice', total_amount: 100, issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = amountStrict(tx, doc, defaultPrefs);
        expect(res.accept).toBe(true);
        expect(res.confidenceDelta).toBe(0.5);
        expect(res.trace).toContain('AMOUNT_STRICT');
    });

    test('rejects when amounts differ', () => {
        const tx: NormalisedTransaction = { transaction_id: 't2', amount: 90, date: null, direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd2', document_type: 'invoice', total_amount: 100, issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = amountStrict(tx, doc, defaultPrefs);
        expect(res.accept).toBe(false);
    });
});

describe('CURRENCY_MATCH', () => {
    test('accepts when currencies match', () => {
        const tx: NormalisedTransaction = { transaction_id: 't3', amount: 100, date: null, direction: null, currency: 'EUR', description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd3', document_type: 'invoice', total_amount: 100, currency: 'EUR', issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = currencyMatch(tx, doc, defaultPrefs);
        expect(res.accept).toBe(true);
        expect(res.confidenceDelta).toBe(0);
    });

    test('rejects when currencies differ and cross‑currency not allowed', () => {
        const tx: NormalisedTransaction = { transaction_id: 't4', amount: 100, date: null, direction: null, currency: 'USD', description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd4', document_type: 'invoice', total_amount: 100, currency: 'EUR', issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = currencyMatch(tx, doc, defaultPrefs);
        expect(res.accept).toBe(false);
    });
});

describe('DATE_WINDOW', () => {
    test('accepts when transaction date within window', () => {
        const tx: NormalisedTransaction = { transaction_id: 't5', amount: 100, date: '2025-01-12', direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd5', document_type: 'invoice', total_amount: 100, issue_date: '2025-01-10', due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = dateWindow(tx, doc, defaultPrefs);
        expect(res.accept).toBe(true);
    });

    test('rejects when transaction date outside window', () => {
        const tx: NormalisedTransaction = { transaction_id: 't6', amount: 100, date: '2025-02-01', direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd6', document_type: 'invoice', total_amount: 100, issue_date: '2025-01-10', due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = dateWindow(tx, doc, defaultPrefs);
        expect(res.accept).toBe(false);
    });
});

describe('REF_MATCH', () => {
    test('boosts when reference appears in description', () => {
        const tx: NormalisedTransaction = { transaction_id: 't7', amount: 100, date: null, direction: null, currency: null, description: 'Payment REF12345', counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd7', document_type: 'invoice', total_amount: 100, payment_reference: 'REF12345', issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, raw_source_id: null };
        const res = refMatch(tx, doc, defaultPrefs);
        expect(res.accept).toBe(true);
        expect(res.confidenceDelta).toBeGreaterThan(0);
    });

    test('no boost when reference missing', () => {
        const tx: NormalisedTransaction = { transaction_id: 't8', amount: 100, date: null, direction: null, currency: null, description: 'Payment', counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd8', document_type: 'invoice', total_amount: 100, payment_reference: 'REF99999', issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, raw_source_id: null };
        const res = refMatch(tx, doc, defaultPrefs);
        expect(res.confidenceDelta).toBe(0);
    });
});

describe('NAME_SIMILARITY', () => {
    test('gives weak boost when names share tokens', () => {
        const tx: NormalisedTransaction = { transaction_id: 't9', amount: 100, date: null, direction: null, currency: null, description: null, counterparty: 'Acme Corp', normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd9', document_type: 'invoice', total_amount: 100, issuer_name: 'Acme Corporation', issue_date: null, due_date: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = nameSimilarity(tx, doc, defaultPrefs);
        expect(res.accept).toBe(true);
        expect(res.confidenceDelta).toBeGreaterThan(0);
    });

    test('no boost when names unrelated', () => {
        const tx: NormalisedTransaction = { transaction_id: 't10', amount: 100, date: null, direction: null, currency: null, description: null, counterparty: 'Foo Bar', normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd10', document_type: 'invoice', total_amount: 100, issuer_name: 'Acme Corp', issue_date: null, due_date: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = nameSimilarity(tx, doc, defaultPrefs);
        expect(res.accept).toBe(false);
        expect(res.confidenceDelta).toBe(0);
    });
});

describe('PARTIAL_PAYMENTS', () => {
    test('rejects partial payment when not allowed', () => {
        const tx: NormalisedTransaction = { transaction_id: 't11', amount: 50, date: null, direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd11', document_type: 'invoice', total_amount: 100, issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = partialPayments(tx, doc, defaultPrefs);
        expect(res.accept).toBe(false);
    });

    test('accepts partial payment when allowed', () => {
        const prefs = { ...defaultPrefs, allow_partial_payments: true };
        const tx: NormalisedTransaction = { transaction_id: 't12', amount: 50, date: null, direction: null, currency: null, description: null, counterparty: null, normalisation_notes: null, raw_source_file: null, raw_line_number: null };
        const doc: NormalisedDocument = { document_id: 'd12', document_type: 'invoice', total_amount: 100, issue_date: null, due_date: null, issuer_name: null, issuer_tax_id: null, status: null, payment_reference: null, raw_source_id: null };
        const res = partialPayments(tx, doc, prefs);
        expect(res.accept).toBe(true);
    });
});
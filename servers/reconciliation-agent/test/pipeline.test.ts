/**
 * Isolated tests for the three pipeline stages.
 * Small synthetic datasets are used to keep the tests fast and deterministic.
 */

import {
    NormalisedTransaction,
    NormalisedDocument,
    MatchingPrefs,
    Candidate,
} from '../src/types';
import { generate_candidates } from '../src/pipeline/generate_candidates';
import { score_candidates } from '../src/pipeline/score_candidates';
import { classify_results } from '../src/pipeline/classify_results';

const prefs: MatchingPrefs = {
    date_tolerance_days: 3,
    pre_issue_grace_days: 0,
    post_due_grace_days: 7,
    min_confidence_auto_match: 0.9,
    min_confidence_candidate: 0.5,
    allow_cross_currency: false,
    allow_partial_payments: false,
};

const tx1: NormalisedTransaction = {
    transaction_id: 'tx1',
    amount: 100,
    date: '2025-01-12',
    direction: null,
    currency: 'EUR',
    description: 'Payment REF123',
    counterparty: 'Acme Corp',
    normalisation_notes: null,
    raw_source_file: null,
    raw_line_number: null,
};

const tx2: NormalisedTransaction = {
    transaction_id: 'tx2',
    amount: 200,
    date: '2025-01-20',
    direction: null,
    currency: 'EUR',
    description: 'Other payment',
    counterparty: 'Beta Ltd',
    normalisation_notes: null,
    raw_source_file: null,
    raw_line_number: null,
};

const docA: NormalisedDocument = {
    document_id: 'docA',
    document_type: 'invoice',
    total_amount: 100,
    issue_date: '2025-01-10',
    due_date: null,
    issuer_name: 'Acme Corporation',
    issuer_tax_id: null,
    status: null,
    payment_reference: 'REF123',
    raw_source_id: null,
};

const docB: NormalisedDocument = {
    document_id: 'docB',
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

describe('generate_candidates', () => {
    test('creates candidates only for hard‑filter passes', () => {
        const candidates = generate_candidates([tx1, tx2], [docA, docB], prefs);
        // Both pairs should pass hard filters (amount, currency, date)
        expect(candidates).toHaveLength(2);
        const ids = candidates.map((c) => `${c.transaction.transaction_id}-${c.document.document_id}`);
        expect(ids).toContain('tx1-docA');
        expect(ids).toContain('tx2-docB');
    });
});

describe('score_candidates', () => {
    test('applies non‑filter rules and updates confidence', () => {
        const raw: Candidate[] = generate_candidates([tx1, tx2], [docA, docB], prefs);
        const scored = score_candidates(raw, prefs);
        // Both candidates should have a positive confidence boost from REF_MATCH / NAME_SIMILARITY
        for (const c of scored) {
            expect(c.confidence).toBeGreaterThan(0);
            expect(c.rule_trace).toContain('REF_MATCH');
            expect(c.rule_trace).toContain('NAME_SIMILARITY');
        }
    });
});

describe('classify_results', () => {
    test('produces definitive matches for clear data', () => {
        const raw = generate_candidates([tx1, tx2], [docA, docB], prefs);
        const scored = score_candidates(raw, prefs);
        const output = classify_results(scored, prefs, ['tx1', 'tx2'], ['docA', 'docB']);
        expect(output.matches.matched_pairs).toHaveLength(2);

        const tx1Match = output.matches.matched_pairs.find(m => m.transaction_ids.includes('tx1'));
        expect(tx1Match).toBeDefined();
        expect(tx1Match?.document_ids).toEqual(['docA']);

        const tx2Match = output.matches.matched_pairs.find(m => m.transaction_ids.includes('tx2'));
        expect(tx2Match).toBeDefined();
        expect(tx2Match?.document_ids).toEqual(['docB']);

        expect(output.matches.ambiguous_matches).toHaveLength(0);
    });
});
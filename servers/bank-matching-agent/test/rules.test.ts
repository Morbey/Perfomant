// test/rules.test.ts

import { describe, it, expect } from 'vitest';
import { runBankMatchingPhase1, NormalisedTransaction } from '../src/index';

describe('Bank Matching Phase 1 Rules', () => {
    // ========================================
    // STRUCTURAL RULE TESTS
    // ========================================
    it('STRUCTURAL: drops transaction missing id, amount, and date', () => {
        const tx: NormalisedTransaction = {
            transaction_id: '',
            date: null,
            amount: null,
            direction: 'debit',
            currency: 'EUR',
        };
        const input = { transactions: [tx] };
        const output = runBankMatchingPhase1(input);
        expect(output.prepared_transactions).toHaveLength(0);
        expect(output.diagnostics.stats.total_transactions).toBe(1);
        expect(output.diagnostics.stats.kept_transactions).toBe(0);
        expect(output.diagnostics.stats.dropped_transactions).toBe(1);
        expect(Object.keys(output.diagnostics.transaction_flags)).toHaveLength(0);
    });

    it('STRUCTURAL: keeps valid transaction', () => {
        const tx: NormalisedTransaction = {
            transaction_id: 'uuid-1',
            date: '2023-01-01',
            amount: 100,
            direction: 'credit',
            currency: 'EUR',
        };
        const input = { transactions: [tx] };
        const output = runBankMatchingPhase1(input);
        expect(output.prepared_transactions).toHaveLength(1);
        expect(output.prepared_transactions[0]).toEqual(tx);
        expect(output.diagnostics.stats.total_transactions).toBe(1);
        expect(output.diagnostics.stats.kept_transactions).toBe(1);
        expect(output.diagnostics.stats.dropped_transactions).toBe(0);
        expect(Object.keys(output.diagnostics.transaction_flags)).toHaveLength(0);
    });

    // ========================================
    // DUPLICATES RULE TESTS
    // ========================================
    it('DUPLICATES: groups transactions with same date, amount, direction, currency', () => {
        const tx1: NormalisedTransaction = {
            transaction_id: 'uuid-A',
            date: '2023-02-01',
            amount: 50,
            direction: 'debit',
            currency: 'EUR',
        };
        const tx2: NormalisedTransaction = {
            transaction_id: 'uuid-B',
            date: '2023-02-01',
            amount: 50,
            direction: 'debit',
            currency: 'EUR',
        };
        const input = { transactions: [tx1, tx2] };
        const output = runBankMatchingPhase1(input);
        expect(output.prepared_transactions).toHaveLength(2);
        expect(output.diagnostics.stats.duplicate_candidates).toBe(2);
        expect(output.diagnostics.duplicate_clusters).toHaveLength(1);
        const cluster = output.diagnostics.duplicate_clusters[0];
        expect(cluster.transaction_uuids.sort()).toEqual(['uuid-A', 'uuid-B'].sort());
        expect(cluster.reason).toContain('currency');
    });

    it('DUPLICATES: groups when one transaction missing currency', () => {
        const tx1: NormalisedTransaction = {
            transaction_id: 'uuid-C',
            date: '2023-03-01',
            amount: 75,
            direction: 'credit',
            currency: null,
        };
        const tx2: NormalisedTransaction = {
            transaction_id: 'uuid-D',
            date: '2023-03-01',
            amount: 75,
            direction: 'credit',
            currency: 'USD',
        };
        const input = { transactions: [tx1, tx2] };
        const output = runBankMatchingPhase1(input);
        expect(output.prepared_transactions).toHaveLength(2);
        expect(output.diagnostics.stats.duplicate_candidates).toBe(2);
        expect(output.diagnostics.duplicate_clusters).toHaveLength(1);
        const cluster = output.diagnostics.duplicate_clusters[0];
        expect(cluster.transaction_uuids.sort()).toEqual(['uuid-C', 'uuid-D'].sort());
        expect(cluster.reason).not.toContain('currency');
    });

    // ========================================
    // DATE_RANGE RULE TESTS
    // ========================================
    it('DATE_RANGE: flags transaction outside period', () => {
        const tx1: NormalisedTransaction = {
            transaction_id: 'uuid-early',
            date: '2023-01-01',
            amount: 100,
            direction: 'debit',
            currency: 'EUR',
        };
        const tx2: NormalisedTransaction = {
            transaction_id: 'uuid-late',
            date: '2023-03-31',
            amount: 200,
            direction: 'credit',
            currency: 'EUR',
        };
        const tx3: NormalisedTransaction = {
            transaction_id: 'uuid-inside',
            date: '2023-02-15',
            amount: 150,
            direction: 'debit',
            currency: 'EUR',
        };
        const input = {
            transactions: [tx1, tx2, tx3],
            matching_context: {
                expected_period: {
                    start: '2023-02-01',
                    end: '2023-02-28',
                },
            },
        };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.transactions_out_of_period).toBe(2);
        expect(output.diagnostics.transaction_flags['uuid-early']).toContain('DATE_OUT_OF_RANGE');
        expect(output.diagnostics.transaction_flags['uuid-late']).toContain('DATE_OUT_OF_RANGE');
        expect(output.diagnostics.transaction_flags['uuid-inside']).toBeUndefined();
    });

    it('DATE_RANGE: skips rule when no expected period', () => {
        const tx: NormalisedTransaction = {
            transaction_id: 'uuid-1',
            date: '2023-01-01',
            amount: 100,
            direction: 'debit',
            currency: 'EUR',
        };
        const input = { transactions: [tx] };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.transactions_out_of_period).toBe(0);
        expect(output.diagnostics.stats.rules_applied).not.toContain('RULE_DATE_RANGE');
    });

    // ========================================
    // CURRENCY RULE TESTS
    // ========================================
    it('CURRENCY: flags inconsistent currency', () => {
        const tx1: NormalisedTransaction = {
            transaction_id: 'uuid-eur',
            date: '2023-02-01',
            amount: 100,
            direction: 'debit',
            currency: 'EUR',
        };
        const tx2: NormalisedTransaction = {
            transaction_id: 'uuid-usd',
            date: '2023-02-02',
            amount: 200,
            direction: 'credit',
            currency: 'USD',
        };
        const input = {
            transactions: [tx1, tx2],
            matching_context: {
                default_currency: 'EUR',
            },
        };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.transaction_flags['uuid-eur']).toBeUndefined();
        expect(output.diagnostics.transaction_flags['uuid-usd']).toContain('INCONSISTENT_CURRENCY');
    });

    it('CURRENCY: skips rule when no default currency', () => {
        const tx: NormalisedTransaction = {
            transaction_id: 'uuid-1',
            date: '2023-01-01',
            amount: 100,
            direction: 'debit',
            currency: 'USD',
        };
        const input = { transactions: [tx] };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.rules_applied).not.toContain('RULE_CURRENCY');
    });

    // ========================================
    // OUTLIERS RULE TESTS
    // ========================================
    it('OUTLIERS: flags transactions above threshold', () => {
        // Create dataset: [10, 20, 30, 40, 50, 60, 70, 80, 90, 1000]
        // Sorted: [10, 20, 30, 40, 50, 60, 70, 80, 90, 1000]
        // Median = (50 + 60) / 2 = 55
        // P90 (90th percentile) = 1000 (index 9)
        // Threshold = max(1000, 55 * 3) = max(1000, 165) = 1000
        const txs: NormalisedTransaction[] = [
            { transaction_id: 'tx1', date: '2023-01-01', amount: 10, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx2', date: '2023-01-02', amount: 20, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx3', date: '2023-01-03', amount: 30, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx4', date: '2023-01-04', amount: 40, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx5', date: '2023-01-05', amount: 50, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx6', date: '2023-01-06', amount: 60, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx7', date: '2023-01-07', amount: 70, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx8', date: '2023-01-08', amount: 80, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx9', date: '2023-01-09', amount: 90, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx10', date: '2023-01-10', amount: 1000, currency: 'EUR', direction: 'debit' },
        ];
        const input = {
            transactions: txs,
            matching_context: { default_currency: 'EUR' },
        };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.outlier_transactions).toBe(1);
        expect(output.diagnostics.transaction_flags['tx10']).toContain('VALUE_OUTLIER');
        expect(output.diagnostics.notes.length).toBeGreaterThan(0);
        expect(output.diagnostics.notes[0]).toContain('Outlier threshold');
    });

    it('OUTLIERS: skips rule with fewer than 5 eligible amounts', () => {
        const txs: NormalisedTransaction[] = [
            { transaction_id: 'tx1', date: '2023-01-01', amount: 10, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx2', date: '2023-01-02', amount: 20, currency: 'EUR', direction: 'debit' },
            { transaction_id: 'tx3', date: '2023-01-03', amount: 30, currency: 'EUR', direction: 'debit' },
        ];
        const input = { transactions: txs };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.rules_applied).not.toContain('RULE_OUTLIERS');
    });

    // ========================================
    // SUSPICIOUS_PATTERNS RULE TESTS
    // ========================================
    it('SUSPICIOUS_PATTERNS: flags repeated transfers within 7 days', () => {
        const txs: NormalisedTransaction[] = [
            {
                transaction_id: 'tx1',
                date: '2023-02-01',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
            {
                transaction_id: 'tx2',
                date: '2023-02-03',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
            {
                transaction_id: 'tx3',
                date: '2023-02-05',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
        ];
        const input = { transactions: txs };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.suspicious_movements).toBe(3);
        expect(output.diagnostics.transaction_flags['tx1']).toContain('SUSPICIOUS_PATTERN');
        expect(output.diagnostics.transaction_flags['tx2']).toContain('SUSPICIOUS_PATTERN');
        expect(output.diagnostics.transaction_flags['tx3']).toContain('SUSPICIOUS_PATTERN');
    });

    it('SUSPICIOUS_PATTERNS: does not flag when spread over more than 7 days', () => {
        const txs: NormalisedTransaction[] = [
            {
                transaction_id: 'tx1',
                date: '2023-02-01',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
            {
                transaction_id: 'tx2',
                date: '2023-02-05',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
            {
                transaction_id: 'tx3',
                date: '2023-02-12',
                amount: 50,
                direction: 'debit',
                counterparty: 'Merchant A',
                currency: 'EUR',
            },
        ];
        const input = { transactions: txs };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.stats.suspicious_movements).toBe(0);
    });

    it('SUSPICIOUS_PATTERNS: flags VALUE_OUTLIER with vague description', () => {
        const txs: NormalisedTransaction[] = [
            { transaction_id: 'tx1', date: '2023-01-01', amount: 10, currency: 'EUR', direction: 'debit', description: 'normal purchase' },
            { transaction_id: 'tx2', date: '2023-01-02', amount: 20, currency: 'EUR', direction: 'debit', description: 'normal purchase' },
            { transaction_id: 'tx3', date: '2023-01-03', amount: 30, currency: 'EUR', direction: 'debit', description: 'normal purchase' },
            { transaction_id: 'tx4', date: '2023-01-04', amount: 40, currency: 'EUR', direction: 'debit', description: 'normal purchase' },
            { transaction_id: 'tx5', date: '2023-01-05', amount: 50, currency: 'EUR', direction: 'debit', description: 'normal purchase' },
            { transaction_id: 'tx-outlier', date: '2023-01-06', amount: 1000, currency: 'EUR', direction: 'debit', description: 'transfer' },
        ];
        const input = {
            transactions: txs,
            matching_context: { default_currency: 'EUR' },
        };
        const output = runBankMatchingPhase1(input);
        expect(output.diagnostics.transaction_flags['tx-outlier']).toContain('VALUE_OUTLIER');
        expect(output.diagnostics.transaction_flags['tx-outlier']).toContain('SUSPICIOUS_PATTERN');
    });
});

import { describe, it, expect } from 'vitest';
import { runBankMatchingPhase1, NormalisedTransaction } from '../src/index';

describe('runBankMatchingPhase1', () => {
    it('should handle empty transactions array', () => {
        const input = { transactions: [] };
        const output = runBankMatchingPhase1(input);

        expect(output.prepared_transactions).toEqual([]);
        expect(output.diagnostics.stats.total_transactions).toBe(0);
        expect(output.diagnostics.stats.kept_transactions).toBe(0);
    });

    it('should pass through a single valid transaction', () => {
        const tx: NormalisedTransaction = {
            transaction_id: 'uuid-1',
            date: '2023-10-27',
            amount: 100.0,
            direction: 'debit',
            currency: 'EUR',
            description: 'Test Transaction'
        };

        const input = { transactions: [tx] };
        const output = runBankMatchingPhase1(input);

        expect(output.prepared_transactions).toHaveLength(1);
        expect(output.prepared_transactions[0]).toEqual(tx);
        expect(output.diagnostics.stats.total_transactions).toBe(1);
        expect(output.diagnostics.stats.kept_transactions).toBe(1);
        expect(Object.keys(output.diagnostics.transaction_flags)).toHaveLength(0);
    });
});

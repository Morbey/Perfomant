import { describe, it, expect } from 'vitest';
import { normalizeTransactionsFromCsv } from '../src/transactions.js';

describe('normalizeTransactionsFromCsv', () => {
    it('should parse a basic CSV correctly', () => {
        const csv = `Date,Description,Amount,Currency
2023-01-01,Test Transaction,100.50,EUR
2023-01-02,Another One,-50.00,EUR`;

        const result = normalizeTransactionsFromCsv(csv);

        expect(result).toHaveLength(2);

        expect(result[0]).toMatchObject({
            date: '2023-01-01',
            description: 'Test Transaction',
            amount: 100.50,
            direction: 'credit',
            currency: 'EUR',
            raw_line_number: 2
        });
        expect(result[0].transaction_id).toBeDefined();

        expect(result[1]).toMatchObject({
            date: '2023-01-02',
            description: 'Another One',
            amount: 50.00,
            direction: 'debit',
            currency: 'EUR',
            raw_line_number: 3
        });
    });

    it('should handle CGD format (Data Mov., Data Valor, Descrição, Valor, Saldo)', () => {
        const csv = `Data Mov.;Data Valor;Descrição;Valor;Saldo Contabilístico
2025-01-03;2025-01-03;COMPRA 123;-12,50;1000,00
2025-01-04;2025-01-04;SALARIO;2500,00;3500,00`;

        const result = normalizeTransactionsFromCsv(csv, { defaultCurrency: 'EUR' });

        expect(result).toHaveLength(2);

        // Debit
        expect(result[0]).toMatchObject({
            date: '2025-01-03',
            description: 'COMPRA 123',
            amount: 12.50,
            direction: 'debit',
            currency: 'EUR'
        });

        // Credit
        expect(result[1]).toMatchObject({
            date: '2025-01-04',
            description: 'SALARIO',
            amount: 2500.00,
            direction: 'credit',
            currency: 'EUR'
        });
    });

    it('should use default currency if missing in CSV', () => {
        const csv = `Date,Description,Amount
2023-01-01,No Currency,100`;

        const result = normalizeTransactionsFromCsv(csv, { defaultCurrency: 'USD' });

        expect(result[0].currency).toBe('USD');
        expect(result[0].normalisation_notes).toContain('Used default currency: USD');
    });

    it('should handle invalid amounts gracefully', () => {
        const csv = `Date,Description,Amount
2023-01-01,Bad Amount,NOT_A_NUMBER`;

        const result = normalizeTransactionsFromCsv(csv);

        expect(result[0].amount).toBe(0);
    });
});

import { describe, it, expect } from 'vitest';
import { normalizeBankCommissionLines } from '../src/commissions.js';

describe('normalizeBankCommissionLines', () => {
    it('should normalize commission lines correctly', () => {
        // Simulating rows that might come from a parser or manual construction
        const rows = [
            {
                'Data': '2025-01-03',
                'Descrição': 'COMISSAO SERVICO',
                'Imposto': 'IS',
                'Base de Incidência': '4,00',
                'Taxa': '4,0000%',
                'Valor Imposto': '0,01',
                'Total': '0,30',
                'Moeda': 'EUR'
            }
        ];

        const result = normalizeBankCommissionLines(rows);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            date: '2025-01-03',
            description: 'COMISSAO SERVICO',
            taxType: 'IS',
            baseAmount: 4.00,
            taxAmount: 0.01,
            totalAmount: 0.30,
            currency: 'EUR'
        });
        expect(result[0].id).toBeDefined();
    });

    it('should handle missing currency with default', () => {
        const rows = [
            {
                'Data': '2025-01-03',
                'Descrição': 'COMISSAO',
                'Total': '0,30'
            }
        ];

        const result = normalizeBankCommissionLines(rows, { defaultCurrency: 'EUR' });

        expect(result[0].currency).toBe('EUR');
        expect(result[0].normalisation_notes).toContain('Used default currency: EUR');
    });
});

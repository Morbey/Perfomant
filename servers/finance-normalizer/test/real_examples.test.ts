import { describe, it, expect } from 'vitest';
import { normalizeTransactionsFromCsv } from '../src/transactions.js';
import { normalizeBankCommissionLines } from '../src/commissions.js';

describe('Real Examples Verification', () => {

    // Mimics "Extrato Depositos - 01.pdf" content based on prompt description
    // "Extrato de conta à ordem: colunas “Data Mov.”, “Data Valor”, “Descrição”, “Valor”, “Saldo Contabilístico”"
    it('should normalize "Extrato Depositos" format (CGD)', () => {
        const csvContent = `Data Mov.;Data Valor;Descrição;Valor;Saldo Contabilístico
2025-01-02;2025-01-02;TRF. MB WAY 919123123;-15,00;1500,00
2025-01-03;2025-01-03;PAGAMENTO SERVICOS;-42,50;1457,50
2025-01-05;2025-01-05;TRANSF. RECEBIDA;+500,00;1957,50`;

        const transactions = normalizeTransactionsFromCsv(csvContent, {
            defaultCurrency: 'EUR',
            sourceFile: 'Extrato Depositos - 01.pdf' // Simulating the source
        });

        expect(transactions).toHaveLength(3);

        // Transaction 1: Debit
        expect(transactions[0]).toMatchObject({
            date: '2025-01-02',
            description: 'TRF. MB WAY 919123123',
            amount: 15.00,
            direction: 'debit',
            currency: 'EUR',
            raw_source_file: 'Extrato Depositos - 01.pdf'
        });
        expect(transactions[0].transaction_id).toBeDefined();

        // Transaction 2: Debit
        expect(transactions[1]).toMatchObject({
            date: '2025-01-03',
            description: 'PAGAMENTO SERVICOS',
            amount: 42.50,
            direction: 'debit',
            currency: 'EUR'
        });

        // Transaction 3: Credit
        expect(transactions[2]).toMatchObject({
            date: '2025-01-05',
            description: 'TRANSF. RECEBIDA',
            amount: 500.00,
            direction: 'credit',
            currency: 'EUR'
        });
    });

    // Mimics "Fatura por conta - 01.pdf" content based on prompt description
    // "Fatura por conta de comissões: linhas como 2025-01-03 COMISSAO SERVICO INTERBANCARIO IS 0,29 4,0000% 0,01 0,30 EUR"
    it('should normalize "Fatura por conta" commission lines', () => {
        // Assuming the input to the normalizer is a structured row object (as it takes Array<Record<string, string>>)
        // In a real flow, a PDF parser (VisionAgent) would produce this structure.
        const rows = [
            {
                'Data': '2025-01-03',
                'Descrição': 'COMISSAO SERVICO INTERBANCARIO',
                'Imposto': 'IS',
                'Base de Incidência': '0,29',
                'Taxa': '4,0000%',
                'Valor Imposto': '0,01',
                'Total': '0,30',
                'Moeda': 'EUR'
            },
            {
                'Data': '2025-01-03',
                'Descrição': 'MANUTENCAO CONTA',
                'Imposto': 'IS',
                'Base de Incidência': '5,00',
                'Taxa': '4,0000%',
                'Valor Imposto': '0,20',
                'Total': '5,20',
                'Moeda': 'EUR'
            }
        ];

        const commissions = normalizeBankCommissionLines(rows, {
            defaultCurrency: 'EUR',
            sourceFile: 'Fatura por conta - 01.pdf'
        });

        expect(commissions).toHaveLength(2);

        // Line 1
        expect(commissions[0]).toMatchObject({
            date: '2025-01-03',
            description: 'COMISSAO SERVICO INTERBANCARIO',
            taxType: 'IS',
            baseAmount: 0.29,
            taxRate: 4.00, // parseAmount handles "4,0000%" -> 4.00
            taxAmount: 0.01,
            totalAmount: 0.30,
            currency: 'EUR',
            raw_source_file: 'Fatura por conta - 01.pdf'
        });
        expect(commissions[0].id).toBeDefined();

        // Line 2
        expect(commissions[1]).toMatchObject({
            date: '2025-01-03',
            description: 'MANUTENCAO CONTA',
            baseAmount: 5.00,
            taxAmount: 0.20,
            totalAmount: 5.20,
            currency: 'EUR'
        });
    });
});

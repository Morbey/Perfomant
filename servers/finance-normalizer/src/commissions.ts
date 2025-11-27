import { BankCommissionLine, NormalizationOptions } from './types.js';
import { generateId, parseAmount, parseDate } from './utils.js';

export function normalizeBankCommissionLines(
    rows: Array<Record<string, string>>,
    options: NormalizationOptions = {}
): BankCommissionLine[] {
    return rows.map((row, index) => {
        const notes: string[] = [];

        // Specific mapping for "Fatura por conta" style
        // Expected headers might vary, but based on prompt example:
        // `2025-01-03 COMISSAO SERVICO INTERBANCARIO IS 0,29 4,0000% 0,01 0,30 EUR`
        // This implies we might be parsing a fixed format or a CSV with specific headers.
        // Assuming the input `rows` are already parsed key-value pairs from a CSV/Table.

        // Heuristic mapping based on common Portuguese terms in bank statements
        const dateRaw = row['Data'] || row['Date'] || '';
        const descRaw = row['Descrição'] || row['Description'] || '';
        const taxType = row['Imposto'] || row['Tax Type'] || row['Tipo Imposto'] || '';

        const baseAmountRaw = row['Base de Incidência'] || row['Base Amount'] || row['Valor Base'] || '';
        const taxRateRaw = row['Taxa'] || row['Tax Rate'] || '';
        const taxAmountRaw = row['Valor Imposto'] || row['Tax Amount'] || '';
        const totalAmountRaw = row['Total'] || row['Total Amount'] || row['Valor Total'] || '';
        const currencyRaw = row['Moeda'] || row['Currency'] || '';

        const date = parseDate(dateRaw);
        if (!date) notes.push(`Could not parse date: ${dateRaw}`);

        let currency = currencyRaw;
        if (!currency) {
            if (options.defaultCurrency) {
                currency = options.defaultCurrency;
                notes.push(`Used default currency: ${options.defaultCurrency}`);
            } else {
                currency = 'UNKNOWN';
                notes.push('Missing currency');
            }
        }

        const line: BankCommissionLine = {
            id: generateId(),
            date,
            description: descRaw,
            taxType: taxType || undefined,
            baseAmount: parseAmount(baseAmountRaw),
            taxRate: taxRateRaw ? parseAmount(taxRateRaw) : null, // Rate might need special % handling if not done in parseAmount
            taxAmount: taxAmountRaw ? parseAmount(taxAmountRaw) : undefined,
            totalAmount: parseAmount(totalAmountRaw),
            currency,
            raw_line_number: index + 1, // Assuming rows are 0-indexed from the start of data
        };

        if (options.sourceFile) {
            line.raw_source_file = options.sourceFile;
        }

        if (notes.length > 0) {
            line.normalisation_notes = notes;
        }

        return line;
    });
}

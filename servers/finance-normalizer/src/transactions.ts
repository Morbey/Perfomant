import { parse } from 'csv-parse/sync';
import { NormalisedTransaction, NormalizationOptions, TransactionDirection } from './types.js';
import { detectDelimiter, generateId, parseAmount, parseDate } from './utils.js';

export function normalizeTransactionsFromCsv(
    csvContent: string,
    options: NormalizationOptions = {}
): NormalisedTransaction[] {
    const delimiter = detectDelimiter(csvContent);

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: delimiter,
        relax_column_count: true,
    });

    return records.map((record: any, index: number) => {
        const notes: string[] = [];

        // --- 1. Mapping Strategy (Bank Profile) ---
        // Simple heuristic mapping for now, can be expanded with bankProfile switch
        let dateRaw = record['Date'] || record['Data Mov.'] || record['Data'] || '';
        let descRaw = record['Description'] || record['Descrição'] || record['Descritivo'] || '';
        let amountRaw = record['Amount'] || record['Valor'] || record['Montante'] || '';
        let currencyRaw = record['Currency'] || record['Moeda'] || '';

        // --- 2. Amount & Direction ---
        let amount = parseAmount(amountRaw);
        let direction: TransactionDirection = 'credit';

        if (amount < 0) {
            direction = 'debit';
            amount = Math.abs(amount);
        } else {
            direction = 'credit';
        }

        // --- 3. Currency ---
        let currency = currencyRaw;
        if (!currency) {
            if (options.defaultCurrency) {
                currency = options.defaultCurrency;
                notes.push(`Used default currency: ${options.defaultCurrency}`);
            } else {
                currency = 'UNKNOWN';
                notes.push('Missing currency and no default provided');
            }
        }

        // --- 4. Date ---
        const date = parseDate(dateRaw);
        if (!date) {
            notes.push(`Could not parse date: ${dateRaw}`);
        }

        // --- 5. Construct Object ---
        const transaction: NormalisedTransaction = {
            transaction_id: generateId(),
            date,
            amount,
            direction,
            description: descRaw,
            currency,
            raw_line_number: index + 2,
        };

        if (options.sourceFile) {
            transaction.raw_source_file = options.sourceFile;
        }

        if (notes.length > 0) {
            transaction.normalisation_notes = notes;
        }

        // Optional fields
        const counterparty = record['Counterparty'] || record['Entidade'];
        if (counterparty) {
            transaction.counterparty = counterparty;
        } else {
            transaction.counterparty = null;
        }

        return transaction;
    });
}

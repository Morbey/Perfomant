import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
    return uuidv4();
}

export function detectDelimiter(content: string): string {
    const firstLine = content.split(/\r?\n/)[0];
    if (!firstLine) return ',';

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
}

export function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    // Remove currency symbols and whitespace
    let clean = amountStr.replace(/[€$£\s]/g, '');

    // Handle European format (1.234,56) vs US format (1,234.56)
    // Heuristic: if last punctuation is comma, it's decimal separator
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot) {
        // European: remove dots, replace comma with dot
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        // US: remove commas
        clean = clean.replace(/,/g, '');
    }

    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

export function parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    // Try ISO first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Try DD-MM-YYYY or DD/MM/YYYY
    const dmy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        const day = dmy[1].padStart(2, '0');
        const month = dmy[2].padStart(2, '0');
        const year = dmy[3];
        return `${year}-${month}-${day}`;
    }

    // Try YYYY/MM/DD
    const ymd = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) {
        const year = ymd[1];
        const month = ymd[2].padStart(2, '0');
        const day = ymd[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return null;
}

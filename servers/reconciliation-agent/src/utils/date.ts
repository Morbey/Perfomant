export function parseDate(dateStr: string): Date | null {
    // Parse ISO date strings deterministically. Returns null for invalid dates.
    const timestamp = Date.parse(dateStr);
    return isNaN(timestamp) ? null : new Date(timestamp);
}

/**
 * Calculate the number of whole days between two dates.
 * The result is always non‑negative.
 */
export function daysBetween(d1: Date, d2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.abs(d1.getTime() - d2.getTime());
    return Math.floor(diff / msPerDay);
}

export function normalizeString(s: string): string {
    // Lowercase and trim whitespace, collapse multiple spaces.
    return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Simple similarity score based on token overlap.
 * Returns a value between 0 and 1.
 */
export function calculateSimilarity(s1: string, s2: string): number {
    const tokens1 = normalizeString(s1).split(' ');
    const tokens2 = normalizeString(s2).split(' ');
    const set2 = new Set(tokens2);
    const common = tokens1.filter(t => set2.has(t)).length;
    const maxLen = Math.max(tokens1.length, tokens2.length);
    return maxLen === 0 ? 0 : common / maxLen;
}

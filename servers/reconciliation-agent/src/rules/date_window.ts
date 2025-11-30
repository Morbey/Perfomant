import { NormalisedTransaction, NormalisedDocument, MatchingPrefs } from '../types';

export function apply_rule(
    transaction: NormalisedTransaction,
    document: NormalisedDocument,
    prefs: MatchingPrefs
): { accept: boolean; confidenceDelta: number; trace: string[] } {
    const trace = ['DATE_WINDOW'];
    // Helper to parse date strings (ISO) to timestamps
    const parse = (d?: string | null) => (d ? Date.parse(d) : NaN);
    const issueDate = parse(document.issue_date);
    const dueDate = parse(document.due_date);
    const txnDate = parse(transaction.date);
    // Determine window start
    let windowStart = Number.NEGATIVE_INFINITY;
    if (!isNaN(issueDate)) {
        const preGrace = (prefs.pre_issue_grace_days ?? 0) * 24 * 60 * 60 * 1000;
        windowStart = issueDate - preGrace;
    }
    // Determine window end
    let windowEnd = Number.POSITIVE_INFINITY;
    if (!isNaN(dueDate)) {
        const postGrace = (prefs.post_due_grace_days ?? 0) * 24 * 60 * 60 * 1000;
        windowEnd = dueDate + postGrace;
    } else if (!isNaN(issueDate)) {
        const tolerance = (prefs.date_tolerance_days ?? 0) * 24 * 60 * 60 * 1000;
        windowEnd = issueDate + tolerance;
    }
    const accept = !isNaN(txnDate) && txnDate >= windowStart && txnDate <= windowEnd;
    const confidenceDelta = accept ? 0.3 : -0.5;
    return { accept, confidenceDelta, trace };
}

import { Candidate, ReconciliationOutput, MatchingPrefs } from '../types';

export function classifyResults(candidates: Candidate[], prefs: MatchingPrefs): ReconciliationOutput {
    // TODO: Implement result classification
    return {
        summary: {},
        matches: {
            matched_pairs: [],
            ambiguous_matches: [],
            unmatched_transactions: [],
            unmatched_documents: []
        },
        diagnostics: {
            rules_applied: [],
            metrics: {},
            notes: []
        }
    };
}

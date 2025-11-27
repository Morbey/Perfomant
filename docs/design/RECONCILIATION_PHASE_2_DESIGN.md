# ReconciliationAgent – Phase 2: Bank ↔ Documents Matching

This document defines **Phase 2** of the Performant financial pipeline:  
deterministic reconciliation between:

1. **Bank side:** `NormalisedTransaction[]` (validated by Phase 1 – BankMatchingAgent)  
2. **Document side:** `NormalisedDocument[]` (from FinanceAgent / VisionAgent / other normalisers)

The goal is to produce a clean, explainable matching between transactions and documents, with clear handling of unmatched and ambiguous cases.

---

## 1. Scope

Phase 2 is responsible for:

- Proposing **matches** between bank transactions and documents.
- Identifying **unmatched** transactions and documents.
- Identifying and structuring **ambiguous matches**.
- Producing deterministic diagnostics and metrics.

Phase 2 is NOT responsible for:

- Normalising documents (OCR, PDF parsing).
- Normalising bank transactions.
- Performing semantic interpretation beyond the rules described here.

---

## 2. Input Contract

The ReconciliationAgent (and the Phase 2 MCP server) receive a single JSON object:

```json
{
  "bank_side": {
    "transactions": [],
    "diagnostics": {},
    "context": {
      "default_currency": "EUR",
      "statement_period": {
        "start": "YYYY-MM-DD",
        "end": "YYYY-MM-DD"
      }
    }
  },
  "document_side": {
    "documents": [],
    "context": {
      "default_currency": "EUR"
    }
  },
  "matching_prefs": {
    "date_tolerance_days": 3,
    "pre_issue_grace_days": 0,
    "post_due_grace_days": 7,
    "min_confidence_auto_match": 0.9,
    "min_confidence_candidate": 0.5,
    "allow_cross_currency": false,
    "allow_partial_payments": false
  }
}
```

### 2.1 NormalisedTransaction (bank side)

Reuses the existing type from finance-normalizer / BankMatching Phase 1:

```ts
type NormalisedTransaction = {
  transaction_id: string;
  date?: string | null;
  amount?: number | null;
  direction?: string | null;
  currency?: string | null;
  description?: string | null;
  counterparty?: string | null;
  normalisation_notes?: string[] | null;
  raw_source_file?: string | null;
  raw_line_number?: number | null;
  [key: string]: unknown;
};
```

Phase 2 only considers **prepared transactions** (the set returned from Phase 1).

### 2.2 NormalisedDocument (document side)

```ts
type NormalisedDocument = {
  document_id: string;
  document_type: string;
  issuer_name?: string | null;
  issuer_tax_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  total_amount: number;
  currency?: string | null;
  status?: string | null;
  payment_reference?: string | null;
  raw_source_id?: string | null;
  [key: string]: unknown;
};
```

### 2.3 matching_prefs (Preferences)

```ts
type MatchingPrefs = {
  date_tolerance_days?: number;
  pre_issue_grace_days?: number;
  post_due_grace_days?: number;
  min_confidence_auto_match?: number;
  min_confidence_candidate?: number;
  allow_cross_currency?: boolean;
  allow_partial_payments?: boolean;
};
```

Defaults are conservative:

- `date_tolerance_days`: 3  
- `pre_issue_grace_days`: 0  
- `post_due_grace_days`: 7  
- `min_confidence_auto_match`: 0.9  
- `min_confidence_candidate`: 0.5  
- `allow_cross_currency`: false  
- `allow_partial_payments`: false  

---

## 3. Output Contract

The Phase 2 MCP server returns:

```json
{
  "summary": {},
  "matches": {
    "matched_pairs": [],
    "ambiguous_matches": [],
    "unmatched_transactions": [],
    "unmatched_documents": []
  },
  "diagnostics": {
    "rules_applied": [],
    "metrics": {},
    "notes": []
  }
}
```

### 3.1 Matched pairs (1↔1 in MVP)

```json
{
  "transaction_ids": ["tx-uuid"],
  "document_ids": ["doc-uuid"],
  "confidence": 0.97,
  "rule_trace": [
    "AMOUNT_STRICT",
    "DATE_WITHIN_TOLERANCE",
    "CURRENCY_MATCH",
    "REF_MATCH"
  ]
}
```

### 3.2 Ambiguous matches

```json
{
  "transaction_ids": ["tx-uuid"],
  "candidate_documents": [
    {
      "document_id": "doc-1",
      "confidence": 0.78,
      "rule_trace": ["AMOUNT_STRICT", "NAME_SIMILARITY"]
    },
    {
      "document_id": "doc-2",
      "confidence": 0.73,
      "rule_trace": ["AMOUNT_STRICT", "DATE_WEAK"]
    }
  ],
  "reason": "Multiple documents with same amount and weak date/name signals"
}
```

### 3.3 Diagnostics

```ts
type MatchingDiagnostics = {
  rules_applied: string[];
  metrics: {
    total_transactions: number;
    total_documents: number;
    definitive_matches: number;
    ambiguous_matches: number;
    unmatched_transactions: number;
    unmatched_documents: number;
    cross_currency_attempts: number;
    partial_payment_patterns: number;
  };
  notes: string[];
};
```

---

## 4. Matching Rules (MVP)

### 4.1 Amount strict (AMOUNT_STRICT)

- Rule: `transaction.amount === document.total_amount`
- If not equal → candidate is rejected.

### 4.2 Currency match (CURRENCY_MATCH)

- If both currencies exist and differ:
  - If `allow_cross_currency === false` → reject.
  - If true → apply a strong penalty.

### 4.3 Date window (DATE_WINDOW)

```
ideal_date = due_date ?? issue_date
window_start = issue_date - pre_issue_grace_days
window_end =
  if due_date exists:
    due_date + post_due_grace_days
  else:
    issue_date + date_tolerance_days
```

### 4.4 Reference match (REF_MATCH)

Boost if reference appears in description or counterparty.

### 4.5 Name similarity (NAME_SIMILARITY)

Weak deterministic similarity.

### 4.6 Partial payments (PARTIAL_PAYMENTS)

Recognised → classified as ambiguous unless prefs allow.

---

## 5. Matching Strategy

### 5.1 Candidate generation

Strict filters first, then scoring.

### 5.2 Confidence scoring

Weighted deterministic sum.

### 5.3 Sorting and filtering

Discard low-confidence candidates.

### 5.4 Classification

- Auto-match: 1 strong candidate.
- Ambiguous: ≥2 or weak.
- Unmatched: 0 candidates.

---

## 6. Integration With Phase 1

May down‑rank VALUE_OUTLIER, SUSPICIOUS_PATTERN, DUPLICATE_CANDIDATE.

---

## 7. Summary Layer

LLM agent builds summary using summary_schema.json.

---

## 8. Non-Goals

- FX conversion  
- line-item matching  
- ML/fuzzy inference  
- auto partial payment allocation  

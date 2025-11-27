# BankMatchingAgent - Phase 1: Ingestion & Diagnostics

This document describes how the **BankMatchingAgent** handles the ingestion and validation of normalised transactions. This phase focuses on **pre-matching diagnostics** and **data health**, ensuring that downstream agents receive clean, well-understood data.

## 1. Input Contract

The agent receives a single JSON object containing the transactions and optional context.

```json
{
  "transactions": [ /* NormalisedTransaction objects */ ],
  "matching_context": {
    "expected_period": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    },
    "default_currency": "EUR"
  }
}
```

### `NormalisedTransaction` Type (Opaque)

The agent treats `NormalisedTransaction` as an opaque type, relying only on standard fields defined in `servers/finance-normalizer/src/types.ts`:
- `transaction_id` (UUID) - **Canonical Identifier**
- `date` (ISO 8601)
- `amount` (Positive number)
- `direction` ('credit' | 'debit')
- `currency`
- `description`
- `counterparty`
- `normalisation_notes`

## 2. Validation Rules (Deterministic)

The agent applies the following rules to generate flags and diagnostics. **No transaction fields are modified.**

### RULE_STRUCTURAL
- **Check**: Missing ALL of: valid `transaction_id`, valid amount, valid date.
- **Action**: Must be dropped from output.

### RULE_DUPLICATES
- **Check**:
  - Same Date (calendar day)
  - Same Amount
  - Same Direction
  - Same Currency **ONLY IF** both transactions have a non-empty currency.
- **Action**: Flag all involved as `DUPLICATE_CANDIDATE`. Group into `duplicate_clusters`.

### RULE_DATE_RANGE
- **Check**: Date strictly before start or strictly after end of `matching_context.expected_period` (if provided).
- **Action**: Flag as `DATE_OUT_OF_RANGE`.

### RULE_CURRENCY
- **Check**: Currency differs from `matching_context.default_currency` (if provided).
- **Action**: Flag as `INCONSISTENT_CURRENCY`.

### RULE_OUTLIERS
- **Check**: Amount >= `max(p90, median * 3)` (requires >= 5 valid transactions).
- **Action**: Flag as `VALUE_OUTLIER`.

### RULE_SUSPICIOUS_PATTERNS
- **Check 1 (Repeated Transfers)**: >= 3 transactions with same Counterparty + Direction + Amount within 7 days.
- **Check 2 (Vague Description)**: `VALUE_OUTLIER` + generic description (e.g., "transfer").
- **Action**: Flag as `SUSPICIOUS_PATTERN`.

## 3. Output Contract

The agent returns a structured object with the original (filtered) transactions and a separate diagnostics block.

```json
{
  "summary": { /* Standard summary_schema.json */ },
  "prepared_transactions": [ /* Array of NormalisedTransaction */ ],
  "diagnostics": {
    "transaction_flags": {
      "uuid-123": ["DATE_OUT_OF_RANGE", "VALUE_OUTLIER"]
    },
    "duplicate_clusters": [
      {
        "transaction_uuids": ["uuid-A", "uuid-B"],
        "reason": "Matched on date+amount+direction"
      }
    ],
    "stats": {
      "total_transactions": 100,
      "kept_transactions": 99,
      "dropped_transactions": 1,
      "duplicate_candidates": 2,
      "outlier_transactions": 5,
      "transactions_out_of_period": 3,
      "suspicious_movements": 0,
      "rules_applied": ["RULE_STRUCTURAL", "RULE_DUPLICATES", "RULE_DATE_RANGE", "RULE_CURRENCY", "RULE_OUTLIERS"]
    },
    "notes": [
      "Outlier threshold set to 1500.00 EUR (p90=1200, median=400)"
    ]
  }
}
```

## 4. Integration Notes

- **CoordinatorAgent**: Should pass the `matching_context` based on the user's request (e.g., "Analyze October statement").
- **Downstream**: Future reconciliation agents will use `prepared_transactions` and `diagnostics` to perform smart matching against documents, prioritizing clean transactions and handling flagged ones with care.

# Finance Phase 0 Design – Normalisation of Bank Transactions

This document defines **Phase 0** of the Performant financial pipeline.  
Phase 0 transforms raw CSV bank statements into **normalised, validated, structured financial transactions**.

It is the foundational stage.  
All later phases (Phase 1 and Phase 2) depend strictly on this output.

---

# 1. Scope

Phase 0 is responsible for:

- Reading raw CSV content from bank statements.
- Detecting delimiters and header mappings.
- Parsing all rows consistently.
- Producing a clean NormalisedTransaction[] array.
- Flagging anomalies and parsing issues.
- Computing basic financial metrics for summaries.
- Guaranteeing deterministic structure for downstream agents.

Phase 0 does NOT:

- Categorise spending.
- Perform matching or reconciliation.
- Handle documents or invoices.
- Transform or fix malformed data beyond normalisation rules.
- Apply heuristics outside the MCP normaliser.

Only the MCP `finance-normalizer` performs the normalisation itself.

---

# 2. Input Contract

The CoordinatorAgent calls FinanceAgent with:

```json
{
  "csvContent": "<raw CSV string>",
  "sourceFile": "optional filename or ID",
  "defaultCurrency": "EUR",
  "bankProfile": "CGD"
}
```

FinanceAgent MUST forward this EXACT structure to the MCP:

```
finance-normalizer.normalizeTransactionsFromCsv(csvContent, {
  sourceFile,
  defaultCurrency,
  bankProfile
})
```

No mutation or pre-processing is allowed.

---

# 3. Output Contract

The MCP returns:

```json
{
  "transactions": [ /* NormalisedTransaction[] */ ]
}
```

FinanceAgent MUST then compute a summary and return:

```json
{
  "summary": { /* summary_schema.json compliant */ },
  "transactions": [ /* NormalisedTransaction[] */ ]
}
```

This is the canonical Phase 0 output.

---

# 4. NormalisedTransaction Schema

The MCP must return objects with at least:

```ts
NormalisedTransaction {
  transaction_id: string;         // UUID v4, unique
  date: string | null;            // parsed ISO date or null
  amount: number | null;          // positive number
  direction: "debit" | "credit";  // direction of flow
  currency: string | null;
  description: string | null;
  counterparty: string | null;
  normalisation_notes: string[];  // anomalies per row
  raw_source_file: string | null;
  raw_line_number: number | null;
}
```

FinanceAgent MUST NOT modify these fields.

---

# 5. Metrics Calculated in Phase 0

FinanceAgent computes:

### 5.1 total_transactions
Number of rows returned.

### 5.2 total_debits
Sum of all transactions where `direction === "debit"`.

### 5.3 total_credits
Sum of all transactions where `direction === "credit"`.

### 5.4 net_total
`total_credits - total_debits`

### 5.5 date_range
Based ONLY on valid ISO dates.

Rules:
- If at least one valid date exists:
  ```
  date_range = { start: earliest, end: latest }
  ```
- If all dates are null:
  ```
  date_range = null
  ```

### 5.6 anomalies
Flatten all `normalisation_notes` from all transactions.

---

# 6. Error Handling

FinanceAgent MUST return controlled errors:

### 6.1 Empty CSV

If CSV contains no rows:

```json
{ "error": "empty_file" }
```

### 6.2 Malformed CSV

If delimiter detection fails, headers cannot be mapped, or rows are malformed:

```json
{ "error": "malformed_csv" }
```

### 6.3 MCP structural error

If MCP returns an invalid structure:

```json
{
  "error": "mcp_malformed_output",
  "details": "<raw output>"
}
```

Never attempt recovery.  
Never guess field values.

---

# 7. Summary Schema Compliance

FinanceAgent MUST produce a summary using `summary_schema.json`, with fields:

- task: "normalise bank transactions"
- domain: "finance"
- inputs_summary:
  - total_transactions_in_csv (optional)
  - file info
- outputs_summary:
  - total_transactions
  - total_debits
  - total_credits
  - net_total
  - date_range
- anomalies: merged normalisation_notes

Awareness mode may include more diagnostics, but never chain-of-thought.

---

# 8. Integration with Phase 1

Phase 0 output feeds **directly** into BankMatchingAgent.

The transactions returned MUST be used as-is:
- No mutation allowed.
- No recalculation or normalisation allowed.

---

# 9. Non-Goals

Phase 0 explicitly does NOT:

- categorise transactions
- enrich data
- match documents
- guess missing values
- apply any financial logic beyond parsing
- generate confidence scores
- apply machine learning
- interpret descriptions semantically

Phase 0 is **pure normalisation only**.

---

# 10. Ready State

This document formalises the complete design of Phase 0.  
All agents and MCP servers must comply strictly with this specification.

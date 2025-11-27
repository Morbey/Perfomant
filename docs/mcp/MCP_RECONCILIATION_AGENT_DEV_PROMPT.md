# MCP Dev Prompt – Reconciliation Agent (Phase 2)

You are **DevAgent**, a deterministic software engineer responsible for implementing the MCP server  
`reconciliation-agent` for **Phase 2** of the Performant pipeline.

This prompt defines EXACTLY what you must build.

You MUST produce:
- a complete Node/TypeScript MCP server
- deterministic, pure-function rule modules
- zero business logic outside the rules
- a fully working `run_reconciliation_phase2` operation
- tests for all rules and integration tests for the pipeline
- NO unused abstractions
- NO speculation outside the design file

Authoritative Source of Truth:
- `RECONCILIATION_PHASE_2_DESIGN.md`
- `summary_schema.json`
- Types inside this prompt

Never improvise. Never invent new fields. Never ask questions. Always produce code.


## 1. Project Structure (MANDATORY)

```
servers/reconciliation-agent/
  package.json
  tsconfig.json
  index.ts
  src/
    types.ts
    engine.ts
    confidence.ts
    utils/
      date.ts
      string.ts
    rules/
      amount_strict.ts
      currency_match.ts
      date_window.ts
      ref_match.ts
      name_similarity.ts
      partial_payments.ts
    pipeline/
      generate_candidates.ts
      score_candidates.ts
      classify_results.ts
  test/
    rules.test.ts
    pipeline.test.ts
    integration.test.ts
```

All modules MUST be deterministic and stateless.

The `index.ts` file MUST expose one MCP operation:

```
run_reconciliation_phase2(input: ReconciliationInput): ReconciliationOutput
```


## 2. Required Types (MANDATORY)

Place these in `src/types.ts`:

```ts
export type NormalisedTransaction = {
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

export type NormalisedDocument = {
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

export type MatchingPrefs = {
  date_tolerance_days?: number;
  pre_issue_grace_days?: number;
  post_due_grace_days?: number;
  min_confidence_auto_match?: number;
  min_confidence_candidate?: number;
  allow_cross_currency?: boolean;
  allow_partial_payments?: boolean;
};

export type ReconciliationInput = {
  bank_side: {
    transactions: NormalisedTransaction[];
    diagnostics: any;
    context: {
      default_currency?: string;
      statement_period?: {
        start: string;
        end: string;
      };
    };
  };
  document_side: {
    documents: NormalisedDocument[];
    context: {
      default_currency?: string;
    };
  };
  matching_prefs: MatchingPrefs;
};

export type Candidate = {
  transaction: NormalisedTransaction;
  document: NormalisedDocument;
  confidence: number;
  rule_trace: string[];
};

export type MatchedPair = {
  transaction_ids: string[];
  document_ids: string[];
  confidence: number;
  rule_trace: string[];
};

export type AmbiguousMatch = {
  transaction_ids: string[];
  candidate_documents: {
    document_id: string;
    confidence: number;
    rule_trace: string[];
  }[];
  reason: string;
};

export type ReconciliationOutput = {
  summary: any;
  matches: {
    matched_pairs: MatchedPair[];
    ambiguous_matches: AmbiguousMatch[];
    unmatched_transactions: string[];
    unmatched_documents: string[];
  };
  diagnostics: {
    rules_applied: string[];
    metrics: Record<string, number>;
    notes: string[];
  };
};
```


## 3. Rule Implementation Requirements

Each rule MUST be a pure function:

```
apply_rule(transaction, document, prefs) -> { accept: boolean, confidence_delta: number, trace?: string }
```

Rules to implement:

1. **AMOUNT_STRICT**
2. **CURRENCY_MATCH**
3. **DATE_WINDOW**
4. **REF_MATCH**
5. **NAME_SIMILARITY**
6. **PARTIAL_PAYMENTS** (during classification)

Each rule MUST:
- never mutate input objects  
- return deterministic values  
- push trace entries like `"AMOUNT_STRICT"`

Rules MUST follow the exact behaviour described in `docs/design/RECONCILIATION_PHASE_2_DESIGN.md`.


## 4. Confidence Engine

`src/confidence.ts` MUST provide deterministic scoring:

- amount strict → base score  
- date window → ± adjustments  
- currency penalties  
- reference match boost  
- name similarity boost  

Confidence MUST be:
- between 0 and 1  
- reproducible  
- deterministic  


## 5. Candidate Pipeline

### 5.1 generate_candidates.ts
- iterate over ALL transaction-document pairs  
- apply strict rejection heuristics  
- accept only valid candidates  
- attach trace and base confidence 0  

### 5.2 score_candidates.ts
- apply scoring rules  
- produce final confidence  

### 5.3 classify_results.ts
- auto-match when:
  - exactly one strong candidate  
  - above `min_confidence_auto_match`  
  - document unused  

- ambiguous if:
  - multiple strong candidates  
  - confidence below auto threshold but above candidate minimum  
  - partial payment pattern  

- unmatched:
  - no candidates above min threshold  


## 6. Metrics

You MUST compute:

- total_transactions  
- total_documents  
- definitive_matches  
- ambiguous_matches  
- unmatched_transactions  
- unmatched_documents  
- cross_currency_attempts  
- partial_payment_patterns  


## 7. Tests (MANDATORY)

### Unit tests
- each rule module  
- edge dates  
- multiple currencies  
- partial payment detection  
- reference matching  
- name similarity  

### Pipeline tests
- candidate generation  
- scoring  
- classification  

### Integration test
- small dataset with:
  - 1 auto-match  
  - 1 ambiguous  
  - 1 unmatched transaction  
  - 1 unmatched document  


## 8. Output Format

Your final response MUST include:
- complete folder & file structure  
- all TypeScript files  
- all tests  
- all config files  

DO NOT OMIT ANY FILE.  
DO NOT SUMMARISE.  
DO NOT HALLUCINATE.


# Product Specification

The Performant product will be a desktop-first application with optional cloud expansion. Features include voice activation, modular agent management, dashboards for automation workflows, execution logs, token-cost monitoring and integration with n8n or other orchestration engines.

Internally, the product will expose the shared JSON summary schema (see `patterns/summary_schema.json`) as a key integration contract. Third-party plugins, external tools or enterprise systems will be able to feed data into Performant by producing schema-compatible summaries, allowing the reasoning core to operate efficiently without understanding every raw format.

Users will be able to enable/disable agents, install plugins, monitor workflows, schedule tasks, trigger automations and browse structured outputs. Over time, a marketplace for skills/modules may be added, where each module declares which schemas it consumes and produces, making Performant an extensible and interoperable automation environment.


# Personal & Micro-Company Finance MVP


## Scope

The first concrete Performant MVP will focus on two closely related workflows:

1. **Personal finance management**
2. **Micro-company finance management** (for a very small medical services company)

Both flows share the same underlying primitives:

- Ingest financial data from **bank statements (CSV)**.
- Ingest and parse **invoices, receipts and payment documents** from PDFs and images.
- Extract structured information from documents (issuer, amount, dates, tax ID, IBAN, line items where possible).
- Match documents against bank statement transactions (reconciliation).
- Provide lightweight, high-signal dashboards when – and only when – they add real insight
  (e.g. spend per category, month‑over‑month trends, cash‑flow overview).

The MVP is primarily for the founder's personal use, but must be designed so that
the same patterns can later be productised for other professionals and micro‑businesses.

## Data sources

- **Bank statements**: CSV exports from online banking.
- **Documents**: PDFs and image files (scanned invoices, receipts, etc.).
- **Email**: a standard consumer Gmail account (OAuth‑based access via an MCP tool).
- **Web**: browser MCP with a visible, intuitive UI for occasional logins and
  confirmations (not for bulk automation in the MVP).

No raw banking credentials, card numbers, PINs or email passwords are ever sent to
an LLM. They are stored locally in a secure vault MCP tool and only accessed by
local code.

## Agents involved

- **CoordinatorAgent (Performant Core)**
  - Entry point for the user.
  - Routes work to sub‑agents based on the task and domain.
  - Enforces use of the summary schema (with finance‑specific extensions).
  - Applies the “total awareness mode” for any paid LLM call.

- **FinanceAgent**
  - Normalises rows from CSV statements into a common schema
    (date, amount, direction, counterparty, category, notes).
  - Normalises extracted documents into a common schema
    (date, amount, issuer, tax ID, payment reference, status).
  - Produces summary‑level analysis and recommendations.
  - Suggests and defines dashboards only when they provide clear additional value.

- **BankMatchingAgent**
  - Performs reconciliation between statement transactions and documents
    (matched, unmatched, suspicious/ambiguous).
  - Outputs structured incident/exception lists for follow‑up.

- **VisionAgent**
  - Uses local OCR / document parsing to turn PDFs and images into structured text.
  - Redacts or avoids exposing any fields that are not needed by the LLM.
  - Exposes clean, structured records to FinanceAgent/BankMatchingAgent.

- **AutomationAgent (later phase)**
  - Orchestrates recurring flows via n8n (e.g. nightly statement ingestion,
    scheduled reconciliation reports, reminder emails).
  - For the MVP, this agent can be stubbed with a minimal interface so that
    the user flows and prompts are already future‑proof.

## Privacy and locality

- All sensitive secrets (bank credentials, IBANs, email OAuth tokens, etc.)
  live inside a local **`secure_vault` MCP tool**.
- LLMs never see these secrets directly – they only request high‑level actions,
  which are executed locally using the vault.
- Financial payloads can be summarised aggressively so that only the minimum
  necessary information is sent to remote models when needed.

## Dashboards

Dashboards are **optional and demand‑driven**. The MVP must avoid “dashboard
for dashboard’s sake” and instead focus on views that clearly support decisions,
for example:

- Distribution of expenses by category for a given period.
- Month‑to‑month evolution of net balance.
- Breakdown of unmatched vs matched transactions.

The spreadsheets MCP tool is the primary target for early dashboards (e.g.
generating a sheet with pivot‑style data that the user can graph), but the
pattern should later extend to embedded charts.

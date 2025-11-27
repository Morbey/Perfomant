
# Finance MVP – Agents & Tools Overview

This document summarises the agents and MCP tools involved in the
personal + micro‑company finance MVP.

## Agents

### CoordinatorAgent

- Single entry point for user prompts.
- Detects whether a task is:
  - personal finance,
  - micro‑company finance,
  - document ingestion/OCR,
  - bank reconciliation,
  - or something else entirely.
- Delegates to FinanceAgent, BankMatchingAgent, VisionAgent or other agents.
- Enforces:
  - Use of the shared summary schema (with finance extensions).
  - Privacy constraints (no secrets to LLMs).
  - Total Awareness Mode for paid calls.

### FinanceAgent

- Works on **normalised financial records**.
- Responsibilities:
  - Transform raw CSV rows into a consistent internal representation.
  - Transform OCR‑extracted documents into structured invoice/receipt records.
  - Categorise transactions (where possible).
  - Produce summaries and analyses focused on decision‑making.
  - Suggest only dashboards that add clear value.

### BankMatchingAgent

- Input:
  - Normalised statement transactions.
  - Normalised invoice/receipt records.
- Output:
  - Per‑transaction reconciliation status:
    - matched,
    - unmatched,
    - ambiguous/suspicious.
  - Structured exception lists that can be re‑used by automation flows
    (e.g. n8n reminders, follow‑up emails).

### VisionAgent

- Applies OCR and document parsing to PDFs and images.
- Runs locally wherever possible to minimise cost and protect privacy.
- Outputs structured fields such as:
  - issuer name,
  - tax ID,
  - invoice number,
  - total amount,
  - tax breakdown if available,
  - payment references and dates.

### AutomationAgent (later)

- Owns the integration with **n8n**:
  - Watches folders or inboxes for new statements/documents.
  - Triggers ingestion + reconciliation flows.
  - Schedules periodic reports.

## MCP Tools in Scope for the MVP

- `filesystem` – read/write CSVs, PDFs, images and config files.
- `browser` – with visible, intuitive UI for occasional manual logins and checks.
- `spreadsheets` – to create and update sheets that act as dashboards or
  pivot‑style data sources.
- `email` – connect to a standard Gmail account via OAuth (no passwords).
- `secure_vault` – local, encrypted secrets store (bank tokens, Gmail tokens, etc.).
- `speech_to_text` – Whisper‑based tool for voice input to the CoordinatorAgent.

These tools are composed via the CoordinatorAgent, which uses the summary
schema patterns to keep interactions with LLMs concise, inspectable and
low‑alucination.

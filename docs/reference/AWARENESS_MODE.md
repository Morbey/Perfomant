
# Total Awareness Mode – Cost Transparency

## Goal

The user wants a **“total awareness mode”** that, when enabled, makes every
paid LLM call transparent before it happens:

- Number of tokens that will be used (input + planned output).
- Model that will be called.
- Estimated monetary cost of that call.
- A confirmation step: the system asks the user whether to proceed.

If the user says **no**, the call is aborted and no paid tokens are consumed.

## Behaviour

- The flag is global and enforced by the **CoordinatorAgent**.
- When `awareness_mode = ON`, any sub‑agent that needs a paid LLM call must:

  1. Compute or estimate:
     - Input token count (prompt + context).
     - Maximum output tokens requested.
     - Price per 1K tokens for the chosen model (from a local price table).
  2. Compute an approximate cost:
     \[
       cost \approx (input\_tokens + output\_tokens) / 1000 * price\_per\_1k
     \]
  3. Return a **preview message** to the user with:
     - Model name.
     - Estimated total tokens.
     - Estimated cost in the user’s currency.
     - A direct yes/no question.

- Only after an explicit **yes** from the user does the CoordinatorAgent allow
  the actual LLM call to proceed.

- When `awareness_mode = OFF`, the system skips the preview and calls the model
  directly (still logging usage for later review).

## Implementation notes

- The local price table should be a small, easily editable config file that
  maps model names to prices per 1K input and output tokens.
- Estimation does not need to be perfect; a conservative upper bound is fine.
- The confirmation channel must be explicit (e.g. a dedicated “cost preview”
  artifact in Antigravity, or a clearly marked message in the chat).

## Safety and UX

- For flows that may auto‑loop (e.g. multi‑step tools or planners),
  awareness mode should **batch** costs where possible and avoid spamming
  the user with confirmations.
- If a given workflow cannot proceed without many calls, the CoordinatorAgent
  should explain this clearly and propose a summary of total estimated cost
  before starting.

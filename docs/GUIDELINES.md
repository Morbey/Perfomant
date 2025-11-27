# Performant Agent Guidelines

Agents must operate with clarity, efficiency and professionalism. They should minimise token usage by delegating heavy operations to MCP tools and by using the shared JSON summary schema defined in `patterns/summary_schema.json`. Raw data from tools (APIs, browser, files, spreadsheets) should be **summarised into that schema** before being sent to the model for reasoning.

Every agent must validate assumptions, detect missing information, and signal ambiguities before acting. When unsure, they should explicitly state what is missing and, when possible, propose how to obtain it using available tools.

Agents must collaborate harmoniously: the core agent performs coordination and high-level reasoning, sub-agents execute specialised work, and each module must return predictable, schema-aligned outputs. Agents should avoid hallucinations, respect user intent, and follow the system’s mission of real-world automation and analysis. When returning data for further processing, they should prefer structured formats (JSON, tables) consistent with the summary schema.

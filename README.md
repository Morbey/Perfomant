# Performant: Autonomous MCP Agent Ecosystem

Performant is a modular, local-first ecosystem of autonomous AI agents built on the Model Context Protocol (MCP). Its goal is to automate business processes, analyse markets, and orchestrate specialised sub-agents using a central reasoning core. The system prioritises privacy, extensibility, token efficiency, and real-world utility for SMEs and professional workflows.

A key design principle of Performant is **summary-first reasoning**: MCP tools fetch and process raw data locally, and only a compact, structured summary is sent to the language model. This is done using a shared JSON summary pattern (see `patterns/summary_schema.json`), which drastically reduces token usage and keeps the model focused on decisions, not raw data shovelling.

This repository provides the core framework, agent prompts, tool specifications, long-term vision, and product direction for expanding Performant into a production-ready automation platform. All agents share a unified philosophy: clarity, collaboration, autonomy, and precision.

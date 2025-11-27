# MCP Tools Specification

Performant uses MCP tools to offload heavy operations away from the language model. Tools are responsible for fetching, transforming and aggregating data. Before data is sent back into the model for reasoning, it should be mapped into the shared summary schema defined in `patterns/summary_schema.json`.

A typical flow is:
1. A tool fetches or processes raw data (files, APIs, web pages, spreadsheets).
2. The agent or tool-side glue code extracts only the relevant fields.
3. The result is compressed into the summary schema:
   - `task` and `context` describe what this data relates to.
   - `inputs_summary.source_data` documents where it came from.
   - `inputs_summary.key_metrics` exposes the essential numbers or facts.
   - `inputs_summary.anomalies` flags any issues.
   - `expected_output_format` tells the model how the final answer will be used.

## Filesystem

Read, write and list files. Used for documents, reports, datasets and automation outputs. Typical usage: load PDFs, CSVs or logs, extract relevant fields, and summarise them into the schema.

## Browser

Navigate pages, extract data, interact with forms, follow links and capture structured content. Browser results should be normalised and turned into compact key metrics and entity lists as per the schema.

## HTTP

Call external APIs, authenticate, retrieve JSON/XML and integrate with cloud services. Raw responses are processed locally into high-level metrics and per-entity structures.

## Email

Read inboxes, extract metadata, classify messages and support workflow automation. Agents should transform email content into entities (senders, threads, topics) and key metrics (counts, statuses) within the summary schema.

## Spreadsheets

Read/write Excel or CSV, modify cells, validate rows and generate data tables. Use spreadsheet tools to aggregate and then emit only aggregated values (counts, sums, deviations, validation flags) into the schema.

## Vector/Memory

Store embeddings or structured memory for long-term context retention and search. When retrieving memory, summarise relevant hits as entities and key metrics in the summary schema so the model can reason over them without loading full historical content.

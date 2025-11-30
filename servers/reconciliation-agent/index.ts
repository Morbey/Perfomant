import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runReconciliationPhase2 } from './src/engine';
import { ReconciliationInput } from './src/types';

// Define Zod schemas for input validation
const NormalisedTransactionSchema = z.object({
    transaction_id: z.string(),
    date: z.string().nullable().optional(),
    amount: z.number().nullable().optional(),
    direction: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    counterparty: z.string().nullable().optional(),
    normalisation_notes: z.array(z.string()).nullable().optional(),
    raw_source_file: z.string().nullable().optional(),
    raw_line_number: z.number().nullable().optional(),
}).passthrough();

const NormalisedDocumentSchema = z.object({
    document_id: z.string(),
    document_type: z.string(),
    issuer_name: z.string().nullable().optional(),
    issuer_tax_id: z.string().nullable().optional(),
    issue_date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    total_amount: z.number(),
    currency: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    payment_reference: z.string().nullable().optional(),
    raw_source_id: z.string().nullable().optional(),
}).passthrough();

const MatchingPrefsSchema = z.object({
    date_tolerance_days: z.number().optional(),
    pre_issue_grace_days: z.number().optional(),
    post_due_grace_days: z.number().optional(),
    min_confidence_auto_match: z.number().optional(),
    min_confidence_candidate: z.number().optional(),
    allow_cross_currency: z.boolean().optional(),
    allow_partial_payments: z.boolean().optional(),
}).optional();

const ReconciliationInputSchema = z.object({
    bank_side: z.object({
        transactions: z.array(NormalisedTransactionSchema),
        diagnostics: z.any().optional(),
        context: z.object({
            default_currency: z.string().optional(),
            statement_period: z.object({
                start: z.string(),
                end: z.string(),
            }).optional(),
        }).optional(),
    }),
    document_side: z.object({
        documents: z.array(NormalisedDocumentSchema),
        context: z.object({
            default_currency: z.string().optional(),
        }).optional(),
    }),
    matching_prefs: MatchingPrefsSchema,
});

// Create MCP server
const server = new McpServer({
    name: "reconciliation-agent",
    version: "1.0.0",
});

// Register the tool
server.tool(
    "run_reconciliation_phase2",
    "Run the Phase 2 reconciliation process matching transactions to documents.",
    {
        input: ReconciliationInputSchema,
    },
    async ({ input }) => {
        // Cast the validated input to our internal type (Zod ensures structure)
        const reconciliationInput = input as unknown as ReconciliationInput;

        // Run the engine
        const output = runReconciliationPhase2(reconciliationInput);

        // Return the result as JSON text
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(output, null, 2),
                },
            ],
        };
    }
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Reconciliation Agent MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});

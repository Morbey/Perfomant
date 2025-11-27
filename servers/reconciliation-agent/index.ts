import { ReconciliationInput, ReconciliationOutput } from './src/types';
import { runReconciliation } from './src/engine';

export function run_reconciliation_phase2(input: ReconciliationInput): ReconciliationOutput {
    return runReconciliation(input);
}

// TODO: Add MCP server setup if required, or just export the function as requested

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DocManager } from './tools.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper to parse arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const rootIndex = args.indexOf('--root');
    if (rootIndex !== -1 && args[rootIndex + 1]) {
        return { root: args[rootIndex + 1] };
    }
    return {};
}

// Helper to find project root by walking up
function findProjectRoot(startDir: string): string {
    let currentDir = startDir;
    const root = path.parse(currentDir).root;

    while (true) {
        const readmePath = path.join(currentDir, 'README.md');
        const docsPath = path.join(currentDir, 'docs');

        if (fs.existsSync(readmePath) && fs.existsSync(docsPath) && fs.statSync(docsPath).isDirectory()) {
            return currentDir;
        }

        if (currentDir === root) {
            throw new Error('Could not find project root (containing README.md and docs/) in any parent directory.');
        }

        currentDir = path.dirname(currentDir);
    }
}

// Main setup
const { root: explicitRoot } = parseArgs();
let rootPath: string;

if (explicitRoot) {
    rootPath = path.resolve(explicitRoot);
    console.error(`Using explicit root: ${rootPath}`);
} else {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        rootPath = findProjectRoot(__dirname);
        console.error(`Auto-detected project root: ${rootPath}`);
    } catch (error) {
        console.error(`Failed to auto-detect project root: ${(error as Error).message}`);
        process.exit(1);
    }
}

const docManager = new DocManager(rootPath);

const server = new Server(
    {
        name: 'performant-docs',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_docs',
                description: 'List all known documentation files with simple metadata.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path_prefix: {
                            type: 'string',
                            description: 'Optional prefix to filter paths (e.g. "docs/")',
                        },
                        kind: {
                            type: 'string',
                            enum: ['markdown', 'json', 'any'],
                            description: 'Filter by file type',
                        },
                    },
                },
            },
            {
                name: 'read_doc',
                description: 'Return the contents of a specific documentation file.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID or path of the document to read',
                        },
                        path: {
                            type: 'string',
                            description: 'Alias for id',
                        },
                    },
                },
            },
            {
                name: 'get_summary_schema',
                description: 'Convenience tool to return the contents of docs/patterns/summary_schema.json.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'search_docs',
                description: 'Run a simple text search over the documentation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query',
                        },
                        path_prefix: {
                            type: 'string',
                            description: 'Optional prefix to filter paths',
                        },
                    },
                    required: ['query'],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case 'list_docs': {
                const schema = z.object({
                    path_prefix: z.string().optional(),
                    kind: z.enum(['markdown', 'json', 'any']).optional(),
                });
                const args = schema.parse(request.params.arguments);
                const docs = await docManager.listDocs(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(docs, null, 2),
                        },
                    ],
                };
            }

            case 'read_doc': {
                const schema = z.object({
                    id: z.string().optional(),
                    path: z.string().optional(),
                });
                const args = schema.parse(request.params.arguments);
                const doc = await docManager.readDoc(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(doc, null, 2),
                        },
                    ],
                };
            }

            case 'get_summary_schema': {
                const doc = await docManager.getSummarySchema();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(doc, null, 2),
                        },
                    ],
                };
            }

            case 'search_docs': {
                const schema = z.object({
                    query: z.string(),
                    path_prefix: z.string().optional(),
                });
                const args = schema.parse(request.params.arguments);
                const results = await docManager.searchDocs(args);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(results, null, 2),
                        },
                    ],
                };
            }

            default:
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${request.params.name}`
                );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid arguments: ${error.message}`
            );
        }
        throw new McpError(
            ErrorCode.InternalError,
            `Error executing tool: ${(error as Error).message}`
        );
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);

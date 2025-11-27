import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

// Define the allowed root directories relative to the project root
const ALLOWED_ROOTS = ['README.md', 'docs'];

export class DocManager {
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = path.resolve(projectRoot);
    }

    private isAllowedPath(filePath: string): boolean {
        const relative = path.relative(this.projectRoot, filePath);
        return !relative.startsWith('..') && !path.isAbsolute(relative) &&
            ALLOWED_ROOTS.some(root => relative === root || relative.startsWith(root + path.sep));
    }

    private getRelativePath(filePath: string): string {
        return path.relative(this.projectRoot, filePath).replace(/\\/g, '/');
    }

    async listDocs(args: { path_prefix?: string; kind?: 'markdown' | 'json' | 'any' }) {
        const { path_prefix, kind = 'any' } = args;

        // Construct glob pattern
        let pattern = '**/*.{md,json}';
        if (kind === 'markdown') pattern = '**/*.md';
        if (kind === 'json') pattern = '**/*.json';

        const files = await glob(pattern, {
            cwd: this.projectRoot,
            ignore: ['**/node_modules/**'],
            nodir: true
        });

        const docs = [];
        for (const file of files) {
            const fullPath = path.join(this.projectRoot, file);
            if (!this.isAllowedPath(fullPath)) continue;

            const relativePath = this.getRelativePath(fullPath);

            // Apply path_prefix filter if provided
            if (path_prefix && !relativePath.startsWith(path_prefix)) continue;

            docs.push({
                id: relativePath,
                path: relativePath,
                kind: file.endsWith('.md') ? 'markdown' : 'json',
                description: path.basename(file, path.extname(file))
            });
        }
        return docs;
    }

    async readDoc(args: { id?: string; path?: string }) {
        const docPath = args.id || args.path;
        if (!docPath) {
            throw new Error('Must provide either id or path');
        }

        const fullPath = path.resolve(this.projectRoot, docPath);

        if (!this.isAllowedPath(fullPath)) {
            throw new Error(`Access denied: ${docPath} is outside allowed documentation areas.`);
        }

        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return {
                path: this.getRelativePath(fullPath),
                kind: fullPath.endsWith('.md') ? 'markdown' : 'json',
                content
            };
        } catch (error) {
            throw new Error(`Failed to read document ${docPath}: ${(error as Error).message}`);
        }
    }

    async getSummarySchema() {
        const schemaPath = 'docs/patterns/summary_schema.json';
        return this.readDoc({ path: schemaPath });
    }

    async searchDocs(args: { query: string; path_prefix?: string }) {
        const { query, path_prefix } = args;
        const docs = await this.listDocs({ path_prefix, kind: 'any' });
        const results = [];

        for (const doc of docs) {
            try {
                const { content } = await this.readDoc({ path: doc.path });
                const lowerContent = content.toLowerCase();
                const lowerQuery = query.toLowerCase();
                const index = lowerContent.indexOf(lowerQuery);

                if (index !== -1) {
                    // Extract a snippet around the match
                    const start = Math.max(0, index - 50);
                    const end = Math.min(content.length, index + query.length + 50);
                    const snippet = (start > 0 ? '...' : '') +
                        content.substring(start, end).replace(/\n/g, ' ') +
                        (end < content.length ? '...' : '');

                    results.push({
                        path: doc.path,
                        snippet
                    });
                }
            } catch (e) {
                // Ignore read errors during search
            }
        }
        return results;
    }
}

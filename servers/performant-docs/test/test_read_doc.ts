import { DocManager } from '../src/tools.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve project root (repository root)
const projectRoot = path.resolve(__dirname, '../../..');

(async () => {
    const dm = new DocManager(projectRoot);
    const doc = await dm.readDoc({ path: 'README.md' });
    console.log('Document path:', doc.path);
    console.log('Kind:', doc.kind);
    console.log('Content length:', doc.content.length);
    console.log('--- Content start ---');
    console.log(doc.content.slice(0, 500)); // first 500 chars
    console.log('--- Content end ---');
})();

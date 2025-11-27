import { DocManager } from '../src/tools.js';
import path from 'path';

async function test() {
    // Assume we are running from the package root, so project root is ../../
    const projectRoot = path.resolve(process.cwd(), '../../');
    console.log(`Testing with project root: ${projectRoot}`);

    const manager = new DocManager(projectRoot);

    console.log('\n--- listDocs ---');
    const docs = await manager.listDocs({});
    console.log(JSON.stringify(docs.slice(0, 3), null, 2)); // Show first 3

    console.log('\n--- readDoc (README.md) ---');
    try {
        const readme = await manager.readDoc({ path: 'README.md' });
        console.log('README.md read successfully, length:', readme.content.length);
    } catch (e) {
        console.error('Error reading README.md:', e);
    }

    console.log('\n--- getSummarySchema ---');
    try {
        const schema = await manager.getSummarySchema();
        console.log('Schema read successfully, length:', schema.content.length);
    } catch (e) {
        console.error('Error reading schema:', e);
    }

    console.log('\n--- searchDocs ("performant") ---');
    const results = await manager.searchDocs({ query: 'performant' });
    console.log(`Found ${results.length} matches`);
    if (results.length > 0) {
        console.log('First match snippet:', results[0].snippet);
    }
}

test().catch(console.error);

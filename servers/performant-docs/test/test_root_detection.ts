import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the server entry point (use tsx to run the TypeScript source directly)
const serverEntry = path.resolve(__dirname, '..', 'src', 'index.ts');

function runServer(args: string[] = []) {
    return new Promise<string>((resolve, reject) => {
        // Use tsx to execute the TypeScript server without a build step
        const cmd = `npx tsx ${serverEntry} ${args.join(' ')}`;
        const serverProcess = exec(cmd, (error, stdout, stderr) => {
            // No need to handle here; we capture stderr events below
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
            stderrOutput += data;
            if (data.includes('Using explicit root') || data.includes('Auto-detected project root')) {
                serverProcess.kill();
                resolve(stderrOutput);
            }
        });

        serverProcess.on('error', (err) => {
            reject(err);
        });

        // Timeout fallback
        setTimeout(() => {
            serverProcess.kill();
            resolve(stderrOutput);
        }, 2000);
    });
}

async function test() {
    console.log('--- Test 1: Auto-detection ---');
    const output1 = await runServer();
    console.log('Output:', output1.trim());
    if (output1.includes('Auto-detected project root')) {
        console.log('PASS: Auto-detection worked');
    } else {
        console.log('FAIL: Auto-detection failed');
    }

    console.log('\n--- Test 2: Explicit Root ---');
    const explicit = path.resolve(__dirname, '../../');
    const output2 = await runServer(['--root', explicit]);
    console.log('Output:', output2.trim());
    if (output2.includes(`Using explicit root: ${explicit}`)) {
        console.log('PASS: Explicit root worked');
    } else {
        console.log('FAIL: Explicit root failed');
    }
}

test().catch(console.error);

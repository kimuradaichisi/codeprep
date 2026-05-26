import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const root = path.resolve(__dirname, '../../');
        await runTests({
            extensionDevelopmentPath: root,
            extensionTestsPath: path.resolve(__dirname, './suite/index'),
            launchArgs: [path.resolve(root, '.vscode-test/test-workspace')]
        });
    } catch {
        console.error('Failed to run tests');
        process.exit(1);
    }
}


main();

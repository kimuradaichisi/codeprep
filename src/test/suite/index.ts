import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({ ui: 'tdd', color: true });
    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }).then(files => {
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
            executeMocha(mocha, c, e);
        }).catch(err => e(err));
    });
}


function executeMocha(mocha: Mocha, resolve: () => void, reject: (err: Error) => void) {
    try {
        mocha.run(failures => failures > 0 ? reject(new Error(`${failures} tests failed.`)) : resolve());
    } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
    }
}


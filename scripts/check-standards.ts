import * as ts from 'typescript';
import * as fs from 'node:fs'; // 'node:' を付けると環境が認識されやすくなります
import { globSync } from 'glob'; // glob v10以降はこの書き方が標準です

const CONFIG = {
    maxFileLines: 300,
    maxMethodLines: 30,
    maxComplexity: 5,
    maxConstructorArgs: 4
};

function analyzeFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const lines = content.split(/\r?\n/);
    const lineCount = lines.length;

    if (lineCount > CONFIG.maxFileLines) {
        console.error(`❌ [File Length] ${filePath}: ${lineCount} lines (Max: ${CONFIG.maxFileLines})`);
    }

    function walk(node: ts.Node) {
        if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isConstructorDeclaration(node)) {
            // メソッド行数のチェック
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
            const methodLines = end.line - start.line;
            
            if (methodLines > CONFIG.maxMethodLines) {
                const name = ts.isConstructorDeclaration(node) ? 'constructor' : node.name?.getText();
                console.error(`❌ [Method Length] ${filePath}:${start.line + 1} - ${name}: ${methodLines} lines`);
            }

            // コンストラクタ引数のチェック
            if (ts.isConstructorDeclaration(node) && node.parameters.length > CONFIG.maxConstructorArgs) {
                console.error(`❌ [Constructor Args] ${filePath}: ${node.parameters.length} args (Max: ${CONFIG.maxConstructorArgs})`);
            }
        }
        ts.forEachChild(node, walk);
    }

    walk(sourceFile);
}

import { execSync } from 'node:child_process';

function getChangedFiles(): string[] {
    try {
        const output = execSync('git status -s', { encoding: 'utf8' });
        return output
            .split(/\r?\n/)
            .map(line => line.replace(/^..\s+/, '').trim())
            .filter(f => (f.startsWith('src/') || f.startsWith('apps/')) && (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.') && fs.existsSync(f));
    } catch {
        return [];
    }
}

function resolveTargetFiles(): string[] {
    const args = process.argv.slice(2);
    if (args.includes('--changed')) {
        return getChangedFiles();
    }
    const specificFiles = args.filter(a => !a.startsWith('--'));
    if (specificFiles.length > 0) {
        return specificFiles.filter(f => fs.existsSync(f));
    }
    return globSync(['src/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'], {
        ignore: ['**/*.test.ts', '**/*.test.tsx', '**/dist/**', '**/node_modules/**']
    }).map(f => f.toString());
}

// 実行部
const targetFiles = resolveTargetFiles();
console.log(`Checking code standards (${targetFiles.length} files)...`);
targetFiles.forEach((file) => analyzeFile(file));
console.log('Standards check completed.');
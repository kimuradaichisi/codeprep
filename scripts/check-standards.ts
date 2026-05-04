import * as ts from 'typescript';
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

const CONFIG = {
    maxFileLines: 150,
    maxMethodLines: 15,
    maxComplexity: 5,
    maxConstructorArgs: 4
};

function analyzeFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const lineCount = content.split('\n').length;

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
                console.error(`❌ [Method Length] ${filePath}:${start.line + 1} - ${node.name?.getText() || 'constructor'}: ${methodLines} lines`);
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

// 実行部
const files = glob.sync('src/**/*.ts', { ignore: 'src/**/*.test.ts' });
files.forEach(analyzeFile);
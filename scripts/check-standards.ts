import * as ts from 'typescript';
import * as fs from 'node:fs'; // 'node:' を付けると環境が認識されやすくなります
import { globSync } from 'glob'; // glob v10以降はこの書き方が標準です

const CONFIG = {
    maxFileLines: 150,
    maxMethodLines: 15,
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

// 実行部
console.log('Checking code standards...');
// globSync を使用
const files = globSync('src/**/*.ts', { ignore: 'src/**/*.test.ts' });
files.forEach((file) => analyzeFile(file.toString()));
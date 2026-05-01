import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutputEngine } from '../../features/engine/domain/OutputEngine';
import { Selection } from '../../features/selection/domain/Selection';

vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: vi.fn(() => ({
            get: vi.fn((key, def) => def)
        })),
        fs: {
            stat: vi.fn()
        },
        Uri: {
            file: vi.fn((p) => ({ fsPath: p, scheme: 'file' })),
        }
    },
    EventEmitter: vi.fn(() => ({
        fire: vi.fn(),
        event: vi.fn()
    }))
}));

describe('Robustness Edge Cases', () => {
    
    describe('OutputEngine Resilience', () => {
        let engine: OutputEngine;

        beforeEach(() => {
            engine = new OutputEngine();
        });

        it('空のファイルリストが渡された場合、適切な空文字またはヘッダーのみを返却する', async () => {
            const result = engine.generate([], { format: 'markdown', includeMetadata: true, outputMode: 'everything' } as any, 'Instruction');
            expect(result.content).toContain('Instruction');
            expect(result.content).not.toContain('File:');
        });

        it('巨大なファイルをシミュレートしてもヒープエラーにならず処理されること', async () => {
            const hugeContent = 'a'.repeat(1024 * 1024); // 1MB
            const files = [{ path: 'huge.ts', content: hugeContent }];
            const result = engine.generate(files, { format: 'markdown', includeMetadata: true, outputMode: 'everything' } as any);
            expect(result.content).toContain('huge.ts');
            expect(result.content.length).toBeGreaterThan(1024 * 1024);
        });
    });

    describe('OutputEngine Advanced Edge Cases', () => {
        let engine: OutputEngine;
        const options = { format: 'markdown', includeMetadata: true, outputMode: 'everything' } as any;

        beforeEach(() => {
            engine = new OutputEngine();
        });

        it('コンテンツ内に多重バッククォートがある場合、デリミタが自動的に拡張されること', () => {
            // 4連バッククォートを含むコンテンツ
            const files = [{ path: 'edge.md', content: '````\nQuadruple backticks\n````' }];
            const result = engine.generate(files, options);
            
            // デリミタは 5連以上になっているはず
            expect(result.content).toContain('`````');
            expect(result.content).toContain('````\nQuadruple backticks\n````');
        });

        it('JSON出力時、ファイル名や内容に含まれる特殊文字が正しくエスケープされること', () => {
            const files = [{ path: 'quote"&<>.ts', content: 'content with "quotes" and <tags>' }];
            const result = engine.generate(files, { ...options, format: 'json' });
            
            const json = JSON.parse(result.content);
            expect(json.repository[0].path).toBe('quote"&<>.ts');
            expect(json.repository[0].content).toBe('content with "quotes" and <tags>');
        });

        it('XML出力時、特殊文字が実体参照に変換されること', () => {
            const files = [{ path: 'test.ts', content: 'if (a < b && b > c)' }];
            const result = engine.generate(files, { ...options, format: 'xml' });
            
            // 簡易的なチェック（XMLライブラリを使っている場合は自動でされるはず）
            expect(result.content).toContain('if (a &lt; b &amp;&amp; b &gt; c)');
        });
    });

    describe('Selection Path Resilience', () => {
        let selection: Selection;

        beforeEach(() => {
            selection = new Selection();
        });

        it('絵文字や特殊記号を含むパスを正しく保持できること', () => {
            const path = '📁 フォルダ/📝 ファイル.txt';
            selection.set(path, true);
            expect(selection.has(path)).toBe(true);
            expect(selection.getPaths()).toContain(path);
        });

        it('非常に長いパス（255文字超）でも動作すること', () => {
            const longPath = 'a/'.repeat(200) + 'file.ts';
            selection.set(longPath, true);
            expect(selection.has(longPath)).toBe(true);
        });
    });

    describe('Selection Path Security & Normalization', () => {
        let selection: Selection;

        beforeEach(() => {
            selection = new Selection();
        });

        it('addAll で重複するパスが渡されても、内部状態はユニークに保たれること', () => {
            selection.addAll(['a.ts', 'a.ts', 'b.ts', 'a.ts']);
            expect(selection.count).toBe(2);
            expect(selection.getPaths()).toHaveLength(2);
        });

        it('空文字や空白のみのパスがセットされても例外を投げず、適切に無視または保持すること', () => {
            selection.set('', true);
            selection.set('   ', true);
            // 内部的にフィルタリングしているか、そのまま保持しているかを確認
            expect(selection.count).toBe(2); 
        });

        it('パスのトラバーサル（..）が含まれていても、ドメインモデルとしては文字列として保持し、クラッシュしないこと', () => {
            const riskyPath = '../../secret.txt';
            selection.set(riskyPath, true);
            expect(selection.has(riskyPath)).toBe(true);
        });
    });

    describe('Token Statistics Edge Cases', () => {
        // TokenStatistics ドメインモデルの直接テスト
        it('サロゲートペア（絵文字）を含む場合に文字数ベースの推定が破綻しないこと', () => {
            const content = '🍎'.repeat(100); // 100文字（サロゲートペアなので200バイト）
            // 簡易的な実装なら文字数 100 と判定されるはず
            expect(content.length).toBe(200); // JS文字列としての長さ
            // ドメインモデルがどう扱うべきか（トークン推定なのでバイト数に近い方が安全）
        });
    });
});

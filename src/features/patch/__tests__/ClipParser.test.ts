import { describe, it, expect } from 'vitest';
import { ClipParser } from '../domain/ClipParser';

describe('ClipParser - Advanced Extraction', () => {
  const parser = new ClipParser();

  // ========== 基本ケース ==========

  it('太字で強調されたパスを抽出できること', () => {
    const markdown = '**src/app.ts**\n```ts\nconst x = 1;\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src/app.ts');
    }
  });

  it('リスト形式のパスを抽出できること', () => {
    const markdown = '- src/utils/helper.ts:\n```ts\nexport const a = 1;\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src/utils/helper.ts');
    }
  });

  it('同一ファイルへの複数コードブロックを統合できること', () => {
    const markdown = `
\`src/a.ts\`:
\`\`\`ts
part 1
\`\`\`

More text...

**src/a.ts**:
\`\`\`ts
part 2
\`\`\`
    `;
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(1);
      expect(result.value[0].filePath).toBe('src/a.ts');
      expect(result.value[0].code).toContain('part 1');
      expect(result.value[0].code).toContain('part 2');
      expect(result.value[0].code).toContain('// ... existing code ...');
    }
  });

  // ========== 複雑なパス ==========

  it('複雑な説明文の中から正確にパスを特定できること', () => {
    const markdown = '次に `src/config.json` を修正します。設定内容は以下の通りです。\n```json\n{ "a": 1 }\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src/config.json');
    }
  });

  it('サブディレクトリを含む複数ファイルを正しく抽出・分離できること', () => {
    const markdown = `
リファクタリング案を提示します。

1. \`core/constants.py\`:
\`\`\`python
A = 1
\`\`\`

2. \`core/utils.py\`:
\`\`\`python
B = 2
\`\`\`

最後に既存の \`main.py\` を更新します。
\`\`\`python
import core.constants
\`\`\`
    `;
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(3);
      expect(result.value[0].filePath).toBe('core/constants.py');
      expect(result.value[1].filePath).toBe('core/utils.py');
      expect(result.value[2].filePath).toBe('main.py');
    }
  });

  // ========== 特殊ファイル名 ==========

  it('DockerfileやLICENSEなど拡張子のないファイルを抽出できること', () => {
    const markdown = '`Dockerfile`:\n```dockerfile\nFROM node\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('Dockerfile');
    }
  });

  it('npmスコープや複数のドットを含む複雑なパスを抽出できること', () => {
    const markdown = '次に `src/@types/custom.test.d.ts` を作成します。\n```ts\nexport type X = 1;\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src/@types/custom.test.d.ts');
    }
  });

  it('Node.jsプロジェクト特有のファイル（.env, package.json）を抽出できること', () => {
    const markdown = 
      '`.env` を作成します。\n' +
      '```\nPORT=3000\n```\n\n' +
      '次に `package.json` を更新します。\n' +
      '```json\n{ "name": "test" }\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].filePath).toBe('.env');
      expect(result.value[1].filePath).toBe('package.json');
    }
  });

  // ========== エッジケース：バッククォート ==========

  it('バッククォートを含むコンテンツを正しく処理できること', () => {
    const markdown = '## File: test.md\n````\n```\ncode\n```\n````';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('test.md');
      expect(result.value[0].code).toContain('```\ncode\n```');
    }
  });

  it('4連バッククォートで囲まれたコードブロックを処理できること', () => {
    const markdown = '`sample.ts`:\n``````\n````ts\nnested\n````\n``````';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].code).toContain('````ts\nnested\n````');
    }
  });

  // ========== エッジケース：パス形式 ==========

  it('Windows形式のパスを抽出できること', () => {
    const markdown = 'Please update `src\\\\components\\\\Button.tsx`:\n```tsx\nexport const Button = () => {};\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src\\\\components\\\\Button.tsx');
    }
  });

  it('@スコープを含むnpmパッケージパスを抽出できること', () => {
    const markdown = '`node_modules/@types/node/index.d.ts`:\n```ts\nexport interface Process {}\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('node_modules/@types/node/index.d.ts');
    }
  });

  it('プラス記号を含むファイル名を抽出できること', () => {
    const markdown = '`C++`:\n```cpp\nint main() {}\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(false); // C++ は有効なパスではない
  });

  // ========== エッジケース：無効な入力 ==========

  it('ブロックがない場合はエラーを返すこと', () => {
    const markdown = 'これはコードブロックがありません。';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(false);
  });

  it('パスが特定できないブロックは無視すること', () => {
    const markdown = '```ts\nconst x = 1;\n```\n```ts\nconst y = 2;\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(false);
  });

  it('環境変数名はパスとして誤認識しないこと', () => {
    const markdown = 'Set `PATH` variable:\n```bash\nexport PATH=/usr/bin\n```';
    const result = parser.parse(markdown);
    // PATH は無効なパスなのでエラー、または他の適切な動作
    expect(result.isSuccess).toBe(false);
  });

  // ========== エッジケース：複雑なマークダウン ==========

  it('コードブロック内の疑似パスを誤認識しないこと', () => {
    const markdown = `
\`real.ts\`:
\`\`\`ts
// This is fake.ts in comments
const x = 1;
\`\`\`
    `;
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('real.ts');
      expect(result.value[0].code).toContain('fake.ts'); // コード内のテキストは保持
    }
  });

  it('複数行にわたる説明文から正しくパスを抽出できること', () => {
    const markdown = `
Here is the file
you need to edit:
\`src/deep/nested/file.ts\`:
\`\`\`ts
export {};
\`\`\`
    `;
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].filePath).toBe('src/deep/nested/file.ts');
    }
  });

  it('同一行に複数のパス候補がある場合、最も近いものを選択すること', () => {
    const markdown = 'Compare `old.ts` with `new.ts`:\n```ts\nconst x = 1;\n```';
    const result = parser.parse(markdown);
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      // コードブロックに最も近いパスを選択
      expect(result.value[0].filePath).toBe('new.ts');
    }
  });
});
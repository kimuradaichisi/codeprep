import { describe, it, expect } from 'vitest';
import { ClipParser } from '../domain/ClipParser';

describe('ClipParser - Advanced Extraction', () => {
  const parser = new ClipParser();

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
});

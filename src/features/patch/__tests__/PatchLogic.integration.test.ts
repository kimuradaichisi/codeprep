// src/features/patch/__tests__/PatchLogic.integration.test.ts
import { describe, it, expect } from 'vitest';
import { ClipParser } from '../domain/ClipParser';
import { OmitHealer } from '../domain/OmitHealer';

describe('Patch Logic Integration - 解析から復元までの一貫した検証', () => {
  const parser = new ClipParser();
  const healer = new OmitHealer();

  it('複数ファイル、新規・既存混在、多言語が入り混じったパッチを完璧に処理できること', () => {
    const markdown = `
リファクタリング案を提示します。

### 1. core/constants.py
\`\`\`python
MAX_RETRY = 5
TIMEOUT = 30
\`\`\`

### 2. src/utils.ts
\`\`\`typescript
export function log(msg: string) {
  // ... existing code ...
  console.log(msg);
}
\`\`\`

### 3. README.md
\`\`\`markdown
# Project Title
<!-- ... -->
## License
\`\`\`
    `;

    // 1. 解析
    const patches = parser.parse(markdown);
    expect(patches.isSuccess).toBe(true);
    const patchList = patches.isSuccess ? patches.value : [];
    const foundPaths = patchList.map(p => p.filePath);
    expect(foundPaths, `Found patches: ${foundPaths.join(', ')}`).toContain('core/constants.py');
    expect(foundPaths).toContain('src/utils.ts');
    expect(foundPaths).toContain('README.md');
    expect(patchList.length).toBe(3);

    // 2. 各ファイルの復元検証
    
    // core/constants.py (新規ファイル想定: オリジナル空)
    const res1 = healer.heal('', patchList.find(p => p.filePath === 'core/constants.py')!.code);
    expect(res1.isSuccess).toBe(true);
    expect(res1.isSuccess && res1.value.code).toContain('MAX_RETRY = 5');

    // src/utils.ts (既存ファイル)
    const originalTs = 'export function log(msg: string) {\n  const date = new Date();\n}';
    const res2 = healer.heal(originalTs, patchList.find(p => p.filePath === 'src/utils.ts')!.code);
    expect(res2.isSuccess, res2.isFailure ? res2.error.message : '').toBe(true);
    expect(res2.isSuccess && res2.value.code).toContain('const date = new Date();');
    expect(res2.isSuccess && res2.value.code).toContain('console.log(msg);');

    // README.md (マークダウンコメント)
    const originalMd = '# Project Title\nThis is a test project.\n## License';
    const res3 = healer.heal(originalMd, patchList.find(p => p.filePath === 'README.md')!.code);
    expect(res3.isSuccess, res3.isFailure ? res3.error.message : '').toBe(true);
    expect(res3.isSuccess && res3.value.code).toContain('This is a test project.');
  });
});
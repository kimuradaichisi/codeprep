/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyScanner } from '../DependencyScanner';

describe('DependencyScanner', () => {
  let scanner: DependencyScanner;
  const mockRoot = '/root';

  beforeEach(() => {
    vi.clearAllMocks();
    // リファクタリング後の引数なしコンストラクタに対応
    scanner = new DependencyScanner();
  });

  it('相対パスのインポートを正しく抽出できること', async () => {
    const content = 'import { Service } from "./src/Service";\nimport { Helper } from "../utils/helper";';
    const currentFile = 'main.ts';
    
    const deps = await scanner.findDependencies(currentFile, content, mockRoot);

    // ロジック側で path.relative(root, absolute) が正しく機能することを検証
    expect(deps).toContain('src/Service');
    expect(deps).toContain('utils/helper');
    expect(deps.length).toBe(2);
  });

  it('外部ライブラリのインポートは無視すること', async () => {
    const content = 'import axios from "axios";\nimport { useState } from "react";';
    const deps = await scanner.findDependencies('app.tsx', content, mockRoot);

    // ドットで始まらないインポートは無視される
    expect(deps.length).toBe(0);
  });

  it('単一引用符と二重引用符の両方に対応すること', async () => {
    const content = "import { x } from './a';\nimport { y } from \"./b\";";
    const deps = await scanner.findDependencies('index.ts', content, mockRoot);

    expect(deps).toContain('a');
    expect(deps).toContain('b');
    expect(deps.length).toBe(2);
});

  it('重複したインポートを排除すること', async () => {
    const content = 'import "./a";\nimport "./a";';
    const deps = await scanner.findDependencies('main.ts', content, mockRoot);

    expect(deps).toEqual(['a']);
    expect(deps.length).toBe(1);
  });
});
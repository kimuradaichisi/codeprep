import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { PatchPreviewProvider } from '../PatchPreviewProvider';
import { PatchCache } from '../../domain/PatchCache';

describe('PatchPreviewProvider', () => {
  const provider = new PatchPreviewProvider();

  it('IDを指定して PatchCache からコンテンツを取得できること', () => {
    const id = 'test-id';
    const content = 'source_content += "test"';
    PatchCache.set(id, content);
    
    const uri = { query: `id=${id}` } as vscode.Uri;
    const result = provider.provideTextDocumentContent(uri);
    expect(result).toBe(content);
  });

  it('存在しないIDの場合は空文字を返すこと', () => {
    const uri = { query: `id=non-existent` } as vscode.Uri;
    const result = provider.provideTextDocumentContent(uri);
    expect(result).toBe('');
  });
});

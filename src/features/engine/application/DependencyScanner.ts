/*
 * Copyright 2026 CodePrep Contributors
 */
import * as path from 'path';

export class DependencyScanner {
  public async findDependencies(currentFile: string, content: string, root: string): Promise<string[]> {
    const imports = content.match(/(?:import|from)\s+['"](\.[^'"]+)['"]/g) || [];
    
    return Array.from(new Set(imports.map(m => {
      const relPath = m.split(/['"]/)[1];
      // currentFile のディレクトリを正しく取得（ルートからの相対パスとして扱う）
      const currentDir = path.dirname(currentFile);
      const basePath = currentDir === '.' ? root : path.join(root, currentDir);
      const absolute = path.resolve(basePath, relPath);
      
      // ルート外を参照する場合は、ルートからの相対パスに正規化
      let result = path.relative(root, absolute).replace(/\\/g, '/');
      
      // ./ で始まる場合は除去
      if (result.startsWith('./')) {
        result = result.slice(2);
      }
      
      // ../ で始まる場合も正しいパスに（ルート外の場合は空文字になることがある）
      if (result.startsWith('../')) {
        // ルートの親を参照する場合は、エイリアスとして解決できないので正規化を試みる
        result = result.replace(/\.\.\//g, '');
      }
      
      return result;
    }).filter(p => p && !p.startsWith('..')))); // 空文字や未解決の親参照を除外
      }
    }
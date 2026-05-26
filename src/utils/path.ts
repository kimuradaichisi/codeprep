import * as path from 'path';

/**
 * パスを正規化します（スラッシュ統一、Windowsドライブレターの小文字化）。
 */
export function normalizePath(p: string): string {
    let normalized = p.replace(/\\/g, '/');
    // Windowsのドライブレター (例: C:/) を小文字に統一して不一致を防ぐ
    if (/^[a-zA-Z]:\//.test(normalized)) {
        normalized = normalized[0].toLowerCase() + normalized.substring(1);
    }
    // 末尾のスラッシュを削除（ルート以外）
    if (normalized.length > 3 && normalized.endsWith('/')) {
        normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
}

/**
 * ワークスペースルートからの相対パスを正規化して取得します。
 */
export function getRelativePath(workspaceRoot: string, targetPath: string): string {
    const normRoot = normalizePath(workspaceRoot);
    const normTarget = normalizePath(targetPath);
    const relative = path.relative(normRoot, normTarget);
    return relative.replace(/\\/g, '/');
}

/**
 * 相対パスをワークスペースルート基準の絶対パスに変換します。
 */
export function getAbsolutePath(workspaceRoot: string, relativePath: string): string {
    return path.join(workspaceRoot, relativePath);
}
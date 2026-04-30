/*
 * Copyright 2026 CodePrep Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as path from 'path';

/**
 * ワークスペースルートからの相対パスを正規化（常にスラッシュ区切り）して取得します。
 */
export function getRelativePath(workspaceRoot: string, targetPath: string): string {
    const relative = path.relative(workspaceRoot, targetPath);
    // Windowsのバックスラッシュをスラッシュに統一
    return relative.split(path.sep).join('/');
}

/**
 * 相対パスをワークスペースルート基準の絶対パスに変換します。
 */
export function getAbsolutePath(workspaceRoot: string, relativePath: string): string {
    return path.join(workspaceRoot, relativePath);
}
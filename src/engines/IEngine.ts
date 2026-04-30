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
import { FileNode } from '../models/FileNode';

export interface IEngine {
    /**
     * 指定されたファイル群とプロンプトから最終的な出力を生成します。
     * @param files ファイルパスと内容のリスト
     * @param prompt ユーザーが指定したプロンプト
     * @param workspaceRoot ワークスペースのルートパス（メタ情報用）
     */
    generate(files: { path: string; content: string }[], prompt?: string, workspaceRoot?: string): Promise<string>;
}

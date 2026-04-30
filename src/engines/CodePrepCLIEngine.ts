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
import { exec } from 'child_process';
import { promisify } from 'util';
import { IEngine } from './IEngine';

const execPromise = promisify(exec);

/**
 * 外部の codeprep CLI を呼び出すエンジン（互換モード）。
 */
export class CodePrepCLIEngine implements IEngine {
    /**
     * 外部CLIを呼び出し、結果をクリップボードにコピーします。
     */
    public async generate(files: { path: string; content: string }[], prompt?: string, workspaceRoot?: string): Promise<string> {
        try {
            // CLIはOSの環境変数やパスに依存するため、npx経由で呼び出す
            // workspaceRoot がある場合は、cwd を指定して実行
            const options = workspaceRoot ? { cwd: workspaceRoot } : {};
            const { stdout } = await execPromise('npx codeprep --copy-to-clipboard --no-check-update', options);
            return stdout || 'CodePrep CLI executed successfully.';
        } catch (error: any) {
            throw new Error(`CLI Execution failed: ${error.message}`);
        }
    }
}

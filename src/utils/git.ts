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
import * as vscode from 'vscode';

const execAsync = promisify(exec);

export class GitUtils {
    public static async getModifiedFiles(workspaceRoot: string): Promise<string[]> {
        try {
            const { stdout } = await execAsync("git status --porcelain", { cwd: workspaceRoot });
            if (!stdout || !stdout.trim()) {
                return [];
            }

            const rawLines = stdout.split("\n");
            const results: string[] = [];

            for (let i = 0; i < rawLines.length; i++) {
                const line = rawLines[i].replace("\r", "");
                if (line.length < 4) continue;

                const status = line.substring(0, 2);
                let pathPart = line.substring(3).trim();

                if (status.indexOf("R") !== -1) {
                    const arrow = " -> ";
                    const arrowIndex = pathPart.lastIndexOf(arrow);
                    if (arrowIndex !== -1) {
                        pathPart = pathPart.substring(arrowIndex + arrow.length).trim();
                    }
                }

                if (pathPart.startsWith('"') && pathPart.endsWith('"')) {
                    pathPart = pathPart.substring(1, pathPart.length - 1);
                    pathPart = pathPart.split('\\"').join('"').split('\\\\').join('\\');
                }

                if (pathPart) {
                    results.push(pathPart);
                }
            }
            return results;
        } catch (error: any) {
            vscode.window.showErrorMessage("Git Error: " + error.message);
            return [];
        }
    }
}

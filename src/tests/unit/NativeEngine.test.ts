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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NativeEngine } from '../../engines/NativeEngine';
import * as vscode from 'vscode';

// 設定値を管理するための変数
let mockConfigValues: Record<string, any> = {};

vi.mock('vscode', () => {
    return {
        workspace: {
            getConfiguration: vi.fn(() => ({
                get: vi.fn((key, defaultValue) => {
                    return mockConfigValues[key] !== undefined ? mockConfigValues[key] : defaultValue;
                })
            }))
        }
    };
});

describe('NativeEngine Unit Tests', () => {
    let engine: NativeEngine;
    const mockFiles = [
        { path: 'src/index.ts', content: 'console.log("hello");' },
        { path: 'src/utils/math.ts', content: 'export const add = (a, b) => a + b;' }
    ];

    beforeEach(() => {
        engine = new NativeEngine();
        mockConfigValues = {};
        vi.clearAllMocks();
    });

    describe('Markdown Format', () => {
        it('should include prompt and tree in Markdown', async () => {
            mockConfigValues['outputFormat'] = 'markdown';
            mockConfigValues['outputMode'] = 'everything';
            mockConfigValues['includeMetadata'] = true;

            const prompt = 'Please refactor this.';
            const result = await engine.generate(mockFiles, prompt);
            
            expect(result).toContain(prompt);
            expect(result).toContain('## Directory Structure');
            expect(result).toContain('├── index.ts');
            expect(result).toContain('## File: src/index.ts');
        });

        it('should handle missing prompt gracefully', async () => {
            mockConfigValues['outputFormat'] = 'markdown';
            const result = await engine.generate(mockFiles, undefined);
            expect(result).not.toContain('undefined');
            expect(result).toContain('## Directory Structure');
        });
    });

    describe('XML Format', () => {
        it('should generate valid XML with instruction and structure', async () => {
            mockConfigValues['outputFormat'] = 'xml';
            const prompt = 'Fix the <bug> & optimize.';
            const result = await engine.generate(mockFiles, prompt);

            expect(result).toContain('<repository>');
            expect(result).toContain('<instruction>');
            // エスケープの確認
            expect(result).toContain('Fix the &lt;bug&gt; &amp; optimize.');
            expect(result).toContain('<structure>');
            expect(result).toContain('└── math.ts');
            expect(result).toContain('<file path="src/index.ts">');
            expect(result).toContain('console.log("hello");');
            expect(result).toContain('</repository>');
        });

        it('should omit instruction tag if prompt is empty', async () => {
            mockConfigValues['outputFormat'] = 'xml';
            const result = await engine.generate(mockFiles, '');
            expect(result).not.toContain('<instruction>');
        });
    });

    describe('JSON Format', () => {
        it('should generate valid JSON object', async () => {
            mockConfigValues['outputFormat'] = 'json';
            const prompt = 'Analyze this.';
            const result = await engine.generate(mockFiles, prompt);

            const parsed = JSON.parse(result);
            expect(parsed.prompt).toBe(prompt);
            expect(parsed.structure).toContain('├── index.ts');
            expect(parsed.repository).toHaveLength(2);
            expect(parsed.repository[0].path).toBe('src/index.ts');
            expect(parsed.repository[0].content).toBe('console.log("hello");');
        });

        it('should have empty prompt if not provided in JSON', async () => {
            mockConfigValues['outputFormat'] = 'json';
            const result = await engine.generate(mockFiles, undefined);
            const parsed = JSON.parse(result);
            expect(parsed.prompt).toBe('');
        });
    });
});

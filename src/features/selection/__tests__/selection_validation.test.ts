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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => ({
    Uri: {
        file: vi.fn((p) => ({ fsPath: p, scheme: 'file' })),
    },
    workspace: {
        fs: {
            stat: vi.fn(),
        },
        getConfiguration: vi.fn(() => ({
            get: vi.fn((key: string) => {
                if (key === 'exclude') return ['**/node_modules/**'];
                return [];
            }),
        })),
    },
}));

import { Selection } from '../domain/Selection';
import { SelectionUseCase } from '../application/SelectionUseCase';
import { ISelectionRepository } from '../domain/ISelectionRepository';
import { IFileValidator } from '../domain/IFileValidator';

describe('SelectionUseCase Integration-like Tests', () => {
    let selection: Selection;
    let useCase: SelectionUseCase;
    let mockRepository: ISelectionRepository;
    let mockValidator: IFileValidator;

    beforeEach(() => {
        vi.clearAllMocks();
        selection = new Selection();
        mockRepository = {
            savePaths: vi.fn().mockResolvedValue(undefined),
            loadPaths: vi.fn(),
            getPresetList: vi.fn().mockReturnValue([]),
            addToPresetList: vi.fn().mockResolvedValue(undefined),
        };
        mockValidator = {
            exists: vi.fn().mockResolvedValue(true),
            isExcluded: vi.fn().mockReturnValue(false),
        };
        // @ts-ignore (実際にはapplication/SelectionUseCase.tsにあるはず)
        useCase = new SelectionUseCase(selection, mockRepository, mockValidator);
    });

    it('選択をクリアできること', () => {
        selection.set('test.ts', true);
        expect(selection.count).toBe(1);
        selection.clear();
        expect(selection.count).toBe(0);
    });

    it('プリセットの保存ができること', async () => {
        selection.set('file1.ts', true);
        await useCase.savePreset('preset1');
        expect(mockRepository.savePaths).toHaveBeenCalledWith('preset1', ['file1.ts']);
        expect(mockRepository.addToPresetList).toHaveBeenCalledWith('preset1');
    });

    it('プリセットのロード時にバリデーションが行われること', async () => {
        vi.mocked(mockRepository.loadPaths).mockResolvedValue(['valid.ts', 'invalid.ts']);
        vi.mocked(mockValidator.exists).mockImplementation(async (p) => p === 'valid.ts');

        const result = await useCase.loadPreset('myPreset');
        
        expect(result).toBe(true);
        expect(selection.has('valid.ts')).toBe(true);
        expect(selection.has('invalid.ts')).toBe(false);
    });
});
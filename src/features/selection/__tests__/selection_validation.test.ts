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
import { SelectionService } from '../../../services/SelectionService';
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

describe('SelectionService Full Coverage', () => {
    let selectionService: SelectionService;
    let mockMemento: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockMemento = {
            get: vi.fn((key: string, defaultValue: any) => defaultValue),
            update: vi.fn().mockResolvedValue(undefined),
        };
        selectionService = new SelectionService(mockMemento);
    });

    it('should clear selection', () => {
        selectionService.setSelection('test.ts', true);
        expect(selectionService.isSelected('test.ts')).toBe(true);
        selectionService.clear();
        expect(selectionService.getSelection().size).toBe(0);
    });

    it('should handle preset lifecycle (save, list)', async () => {
        selectionService.setSelection('file1.ts', true);
        
        await selectionService.savePreset('preset1');
        expect(mockMemento.update).toHaveBeenCalledWith('codeprep.preset.preset1', ['file1.ts']);
        expect(mockMemento.update).toHaveBeenCalledWith('codeprep.presets', ['preset1']);

        mockMemento.get.mockReturnValue(['preset1']);
        await selectionService.savePreset('preset1');
        expect(mockMemento.update).toHaveBeenCalledTimes(3); 
    });

    it('should return empty list if no presets exist', () => {
        mockMemento.get.mockImplementation((key: string, def: any) => def);
        expect(selectionService.getPresetList()).toEqual([]);
    });

    it('should return false on loadPreset if preset does not exist', async () => {
        mockMemento.get.mockReturnValue(null);
        const result = await selectionService.loadPreset('ghost', '/root');
        expect(result).toBe(false);
    });

    it('should validate and filter paths during loadPreset', async () => {
        mockMemento.get.mockReturnValue(['valid.ts', 'node_modules/bad.ts']);
        (vscode.workspace.fs.stat as any).mockResolvedValue({});

        await selectionService.loadPreset('myPreset', '/root');
        
        expect(selectionService.isSelected('valid.ts')).toBe(true);
        expect(selectionService.isSelected('node_modules/bad.ts')).toBe(false);
    });
});
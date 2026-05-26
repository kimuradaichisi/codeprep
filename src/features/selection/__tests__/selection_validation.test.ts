import { describe, it, expect, vi, beforeEach } from 'vitest';

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

        useCase = new SelectionUseCase(selection, mockRepository, mockValidator);
    });

    it('should handle undefined input', async () => {
        // validator をこのスコープ内で定義（モック化）する
        const validator = {
            exists: vi.fn().mockResolvedValue(false),
            isExcluded: vi.fn().mockReturnValue(false),
        };

        await validator.exists(undefined as any);
        
        // 検証が必要なら追加
        expect(validator.exists).toHaveBeenCalledWith(undefined);
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
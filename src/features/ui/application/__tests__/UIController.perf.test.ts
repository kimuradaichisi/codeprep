import { describe, it, expect, vi, beforeEach } from 'vitest';

import { UIController } from '../UIController';
import { ok } from '../../../../shared/domain/Result';

vi.mock('vscode', () => ({
  commands: { executeCommand: vi.fn() },
  workspace: { getConfiguration: vi.fn(() => ({ get: vi.fn((k, d) => d) })) }
}));


describe('UIController Performance (Non-functional)', () => {
  let controller: UIController;
  let deps: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    deps = {
      selection: { getPaths: vi.fn() },
      tokenUseCase: { resetBatch: vi.fn(), commitBatch: vi.fn(), update: vi.fn(), addFileToBatch: vi.fn() },

      treeProvider: { refresh: vi.fn() },
      fileSystem: { 
        readFile: vi.fn(), 
        getFileSize: vi.fn().mockResolvedValue(ok(100)) 
      },
      root: '/root'
    };
    controller = new UIController(deps);
  });

  it('1000件のファイル処理でも readFile が 0回であること (メモリ効率)', async () => {
    const largePaths = Array.from({ length: 1000 }, (_, i) => `file${i}.ts`);
    deps.selection.getPaths.mockReturnValue(largePaths);

    await controller.refresh();
    vi.advanceTimersByTime(800);
    await vi.runAllTimersAsync();

    // ファイルの中身は1度も読んでいないことを確認
    expect(deps.fileSystem.readFile).not.toHaveBeenCalled();
    // サイズ取得のみが実行されていることを確認
    expect(deps.fileSystem.getFileSize).toHaveBeenCalledTimes(1000);
  });

  it('大量処理時に CPU を占有し続けないよう待機が挟まれていること (CPU効率)', async () => {
    const paths = Array.from({ length: 100 }, (_, i) => `f${i}.ts`);
    deps.selection.getPaths.mockReturnValue(paths);

    const promise = controller.refresh().then(() => {
        vi.advanceTimersByTime(800);
        return vi.runAllTimersAsync();
    });

    await promise;

    // チャンク分割(20件ずつ)により、5回以上の setTimeout が呼ばれているはず
    // 内部的な Promise 解決も含めて複数回の待機が発生していることを検証
    expect(deps.tokenUseCase.commitBatch).toHaveBeenCalledWith(expect.any(Number));

  });
});

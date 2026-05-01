import * as vscode from 'vscode';
import { Selection } from './features/selection/domain/Selection';
import { SelectionUseCase } from './features/selection/application/SelectionUseCase';
import { VSCodeSelectionRepository } from './features/selection/infrastructure/VSCodeSelectionRepository';
import { VSCodeFileValidator } from './features/selection/infrastructure/VSCodeFileValidator';
import { VSCodeWorkspaceRepository } from './features/selection/infrastructure/VSCodeWorkspaceRepository';
import { OutputEngine } from './features/engine/domain/OutputEngine';
import { TokenUseCase } from './features/token/application/TokenUseCase';
import { VSCodeStatusBarPresenter } from './features/token/infrastructure/VSCodeStatusBarPresenter';
import { PromptUseCase } from './features/prompt/application/PromptUseCase';
import { VSCodePromptRepository } from './features/prompt/infrastructure/VSCodePromptRepository';
import { FileTreeProvider } from './features/ui/FileTreeProvider';
import { PreviewProvider } from './features/ui/PreviewProvider'; // 追加
import { UIController } from './features/ui/application/UIController';
import { registerAllCommands } from './commands/CommandRegistry';

export async function activate(context: vscode.ExtensionContext) {
  try {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const selection = new Selection();
    const workspaceRepo = new VSCodeWorkspaceRepository(root || '');
    const selectionRepo = new VSCodeSelectionRepository(context.workspaceState);
    const fileValidator = new VSCodeFileValidator(root || '');
    const selectionUseCase = new SelectionUseCase(selection, selectionRepo, fileValidator);
    const promptUseCase = new PromptUseCase(new VSCodePromptRepository());
    const tokenPresenter = new VSCodeStatusBarPresenter();
    const tokenUseCase = new TokenUseCase(tokenPresenter);
    const engine = new OutputEngine();

    const treeProvider = new FileTreeProvider(root, selection);
    const treeView = vscode.window.createTreeView('codeprep.fileTree', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
      manageCheckboxStateManually: true
    });

    const uiController = new UIController(selection, tokenUseCase, treeProvider, root);

    // コマンドの登録
    const commands = registerAllCommands(
      context, selectionUseCase, promptUseCase, uiController, engine, workspaceRepo, root
    );

    context.subscriptions.push(
      treeView,
      tokenPresenter,
      ...commands,
      // ★追加: プレビュープロバイダーの登録
      vscode.workspace.registerTextDocumentContentProvider(PreviewProvider.scheme, new PreviewProvider()),
      // ★追加: 設定変更の監視
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('codeprep.visibleButtons')) {
          uiController.updateButtonContexts();
        }
      }),
      treeView.onDidChangeCheckboxState(async (e) => {
        for (const [node, state] of e.items) {
          const item = node as any;
          if (item.isDirectory) {
            await selectionUseCase.updateDirectorySelection(workspaceRepo, item.relativePath, state === vscode.TreeItemCheckboxState.Checked);
          } else {
            selection.set(item.relativePath, state === vscode.TreeItemCheckboxState.Checked);
          }
        }
        await uiController.refresh();
      })
    );

    await uiController.updateButtonContexts();
    await uiController.refresh();
  } catch (error) {
    console.error('CodePrep activation failed:', error);
  }
}

export function deactivate() {}
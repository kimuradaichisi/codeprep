import * as vscode from 'vscode';
import * as path from 'path';

// Features
import { Selection } from './features/selection/domain/Selection';
import { FileNode } from './features/ui/models/FileNode';
import { SelectionUseCase } from './features/selection/application/SelectionUseCase';
import { VSCodeSelectionRepository } from './features/selection/infrastructure/VSCodeSelectionRepository';
import { VSCodeFileValidator } from './features/selection/infrastructure/VSCodeFileValidator';
import { VSCodeWorkspaceRepository } from './features/selection/infrastructure/VSCodeWorkspaceRepository';

import { OutputEngine } from './features/engine/domain/OutputEngine';
import { TokenUseCase } from './features/token/application/TokenUseCase';
import { VSCodeStatusBarPresenter } from './features/token/infrastructure/VSCodeStatusBarPresenter';

import { PromptUseCase } from './features/prompt/application/PromptUseCase';
import { VSCodePromptRepository } from './features/prompt/infrastructure/VSCodePromptRepository';

// UI
import { FileTreeProvider } from './features/ui/FileTreeProvider';
import { PreviewProvider } from './features/ui/PreviewProvider';
import { GitUtils } from './utils/git';

export async function activate(context: vscode.ExtensionContext) {
  try {
    const getWorkspaceRoot = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const root = getWorkspaceRoot();

    // 1. Initialize Selection Feature
    const selection = new Selection();
    const selectionRepo = new VSCodeSelectionRepository(context.workspaceState);
    const fileValidator = new VSCodeFileValidator(root || '');
    const workspaceRepo = new VSCodeWorkspaceRepository(root || '');
    const selectionUseCase = new SelectionUseCase(selection, selectionRepo, fileValidator);

    // 2. Initialize Engine & Token Feature
    const engine = new OutputEngine();
    const tokenPresenter = new VSCodeStatusBarPresenter();
    const tokenUseCase = new TokenUseCase(tokenPresenter);
    context.subscriptions.push(tokenPresenter);

    // 3. Initialize Prompt Feature
    const promptRepo = new VSCodePromptRepository();
    const promptUseCase = new PromptUseCase(promptRepo);

    // 4. Initialize UI
    const treeProvider = new FileTreeProvider(root, selection);
    const previewProvider = new PreviewProvider();
    const treeView = vscode.window.createTreeView('codeprep.fileTree', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
      manageCheckboxStateManually: true
    });

    // Helper: Update Status and Contexts
    const refreshUI = async () => {
      try {
        const selectedPaths = selection.getPaths();
        await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', selectedPaths.length === 0);
        
        // ガードレール: 選択数が極端に多い場合はステータスバーの更新（大量のstat発行）をスキップする
        if (selectedPaths.length > 10000) {
          console.warn(`CodePrep: Too many files selected (${selectedPaths.length}). Skipping token calculation.`);
          tokenUseCase.update([], 0); 
          treeProvider.refresh();
          return;
        }

        // ファイル情報の取得を並列化し、ディレクトリを除外する
        const fileInfos = await Promise.all(selectedPaths.map(async p => {
          if (!root) return null;
          try {
            const uri = vscode.Uri.file(path.join(root, p));
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.Directory) return null;
            return { path: p, size: stat.size };
          } catch (e) {
            return null;
          }
        }));
        
        const files = fileInfos.filter((f): f is { path: string, size: number } => f !== null);
        
        const config = vscode.workspace.getConfiguration('codeprep');
        tokenUseCase.update(files, config.get('tokenLimit', 100000));
        treeProvider.refresh();
      } catch (e) {
        console.error('CodePrep: UI Refresh Error', e);
      }
    };

    const updateButtonContexts = async () => {
      const config = vscode.workspace.getConfiguration('codeprep');
      const visibleButtons = config.get<string[]>('visibleButtons', []);
      const buttonContextMap: Record<string, string> = {
        'codeprep.refreshTree': 'codeprep.showRefreshTree',
        'codeprep.selectAll': 'codeprep.showSelectAll',
        'codeprep.clearAll': 'codeprep.showClearAll',
        'codeprep.generate': 'codeprep.showGenerate',
        'codeprep.selectGitDiff': 'codeprep.showSelectGitDiff',
        'codeprep.selectPrompt': 'codeprep.showSelectPrompt',
        'codeprep.savePreset': 'codeprep.showSavePreset',
        'codeprep.loadPreset': 'codeprep.showLoadPreset',
        'codeprep.invertSelection': 'codeprep.showInvertSelection',
        'codeprep.exportPresets': 'codeprep.showExportPresets',
        'codeprep.importPresets': 'codeprep.showImportPresets'
      };

      for (const [commandId, contextKey] of Object.entries(buttonContextMap)) {
        await vscode.commands.executeCommand('setContext', contextKey, visibleButtons.includes(commandId));
      }
    };

    // 5. Register Commands
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('codeprep.visibleButtons')) {
          await updateButtonContexts();
        }
      }),

      vscode.commands.registerCommand('codeprep.refreshTree', async () => {
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('codeprep.selectAll', async () => {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "CodePrep: Selecting all files...",
          cancellable: false
        }, async () => {
          await selectionUseCase.selectAll(workspaceRepo);
          await refreshUI();
        });
      }),

      vscode.commands.registerCommand('codeprep.clearAll', async () => {
        selection.clear();
        await refreshUI();
      }),

      vscode.commands.registerCommand('codeprep.invertSelection', async () => {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "CodePrep: Inverting selection...",
          cancellable: false
        }, async () => {
          const allFiles = await workspaceRepo.getAllFiles();
          selection.invert(allFiles);
          await refreshUI();
        });
      }),

      vscode.commands.registerCommand('codeprep.selectGitDiff', async () => {
        if (root) {
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodePrep: Scanning git changes...",
            cancellable: false
          }, async () => {
            await selectionUseCase.selectModifiedFiles(GitUtils, root);
            await refreshUI();
          });
        }
      }),

      vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
        const collection = await promptUseCase.getAvailablePrompts();
        const items = collection.all.map(t => ({
          label: t.name,
          description: t.summary,
          content: t.content
        }));

        const clearItem = {
          label: "$(clear-all) Clear Selection",
          description: "プロンプトの使用を解除する",
          content: undefined
        };

        const selected = await vscode.window.showQuickPick([clearItem, ...items], {
          placeHolder: '使用するプロンプトを選択してください'
        });

        if (selected) {
          if (selected === clearItem) {
            promptUseCase.selectPrompt(undefined);
            vscode.window.showInformationMessage('CodePrep: プロンプトの選択を解除しました。');
          } else {
            promptUseCase.selectPrompt(selected.label);
            vscode.window.showInformationMessage(`CodePrep: プロンプト "${selected.label}" を選択しました。`);
          }
        }
      }),

      vscode.commands.registerCommand('codeprep.deletePrompt', async () => {
        const collection = await promptUseCase.getAvailablePrompts();
        const items = collection.all.map(t => ({
          label: t.name,
          description: t.summary
        }));

        if (items.length === 0) {
          vscode.window.showInformationMessage('CodePrep: 削除できるカスタムプロンプトがありません。');
          return;
        }

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: '削除するプロンプトを選択してください'
        });

        if (selected) {
          const confirm = await vscode.window.showWarningMessage(
            `プロンプト "${selected.label}" を削除してもよろしいですか？`,
            { modal: true },
            '削除'
          );

          if (confirm === '削除') {
            await promptUseCase.deletePrompt(selected.label);
            vscode.window.showInformationMessage(`CodePrep: プロンプト "${selected.label}" を削除しました。`);
          }
        }
      }),

      vscode.commands.registerCommand('codeprep.generate', async () => {
        const selectedPaths = selection.getPaths();
        if (selectedPaths.length === 0) return;

        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "CodePrep: Packing files...",
          cancellable: false
        }, async (progress) => {
          const filesWithContent = await Promise.all(selectedPaths.map(async p => {
            try {
              const uri = vscode.Uri.file(path.join(root || '', p));
              const stat = await vscode.workspace.fs.stat(uri);
              if (stat.type === vscode.FileType.Directory) return null;
              const content = (await vscode.workspace.fs.readFile(uri)).toString();
              return { path: p, content };
            } catch (e) {
              return null;
            }
          }));

          const files = filesWithContent.filter((f): f is { path: string, content: string } => f !== null);
          if (files.length === 0) {
            vscode.window.showWarningMessage('No files selected to generate content.');
            return;
          }

          const config = vscode.workspace.getConfiguration('codeprep');
          const options = {
            format: config.get('outputFormat', 'markdown') as any,
            outputMode: config.get('outputMode', 'everything') as any,
            includeMetadata: config.get('includeMetadata', true),
            removeComments: config.get('removeComments', false),
            includeEmptyLines: config.get('includeEmptyLines', true)
          };

          const promptName = promptUseCase.getSelectedPrompt();
          const promptContent = promptName ? await promptUseCase.getPromptContent(promptName) : undefined;
          const result = engine.generate(files, options, promptContent);
          await vscode.env.clipboard.writeText(result.content);
          vscode.window.showInformationMessage('CodePrep: Pack completed and copied to clipboard.');
        });
      }),

      vscode.workspace.registerTextDocumentContentProvider(PreviewProvider.scheme, previewProvider),
      treeView.onDidChangeCheckboxState(async (e) => {
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Window,
          title: "CodePrep: Updating selection..."
        }, async () => {
          for (const [node, state] of e.items) {
            const checked = state === vscode.TreeItemCheckboxState.Checked;
            const item = node as any;
            if (item.isDirectory) {
              await selectionUseCase.updateDirectorySelection(workspaceRepo, item.relativePath, checked);
              treeProvider.refresh(node as FileNode); // 明示的にこのノードとその配下を更新
            } else {
              selection.set(item.relativePath, checked);
              treeProvider.refresh(node as FileNode); // ファイルも念のため更新
            }
          }
          await refreshUI();
        });
      })
    );

    await updateButtonContexts();
    await refreshUI();
  } catch (error) {
    console.error('CodePrep activation failed:', error);
    vscode.window.showErrorMessage(`CodePrep の起動に失敗しました: ${error}`);
  }
}

export function deactivate() {}


import * as vscode from 'vscode';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { GitUtils } from '../utils/git';
import { PreviewProvider } from '../features/ui/PreviewProvider';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  selectionUseCase: SelectionUseCase,
  promptUseCase: PromptUseCase,
  uiController: UIController,
  engine: OutputEngine,
  workspaceRepo: VSCodeWorkspaceRepository,
  root: string | undefined
): vscode.Disposable[] {
  return [
    // --- 一般コマンド ---
    vscode.commands.registerCommand('codeprep.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep');
    }),

    vscode.commands.registerCommand('codeprep.refreshTree', async () => {
      await uiController.refresh();
    }),

    // --- Git関連 ---
    vscode.commands.registerCommand('codeprep.gitMenu', async () => {
      if (!root) return;
      const items = [
        { label: "$(file-diff) Select Modified Files", id: 'mod' },
        { label: "$(beaker) Select Modified + Related Tests", id: 'tests' },
        { label: "$(git-commit) Copy Commit Message Prompt", id: 'commit' }
      ];
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Gitアクションを選択' });
      if (!selected) return;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `CodePrep: ${selected.label}`
      }, async () => {
        if (selected.id === 'mod' || selected.id === 'tests') {
          await selectionUseCase.selectModifiedFiles(GitUtils, root, selected.id === 'tests');
          await uiController.refresh();
        } else if (selected.id === 'commit') {
          const diff = await GitUtils.getDiff(root);
          if (!diff) {
            vscode.window.showInformationMessage('差分がありません。');
            return;
          }
          const prompt = `以下のgit diffに基づき、コミットメッセージを提案してください。\n\n${diff}`;
          await vscode.env.clipboard.writeText(prompt);
          vscode.window.showInformationMessage('プロンプトをコピーしました。');
        }
      });
    }),

    // --- 生成関連 ---
    vscode.commands.registerCommand('codeprep.generate', async () => {
      const paths = selectionUseCase.currentSelection.getPaths();
      if (paths.length === 0) return;

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "CodePrep: Generating content...",
      }, async () => {
        const filesWithContent = await Promise.all(paths.map(async p => {
          try {
            const uri = vscode.Uri.file(path.join(root || '', p));
            const stat = await vscode.workspace.fs.stat(uri);
            
            // 重要: ビット演算を使用して「File」フラグが含まれているか確認
            // Directory(2) や SymbolicLinkToDir(66) はここで null になる
            if (!(stat.type & vscode.FileType.File)) return null;

            const contentRaw = await vscode.workspace.fs.readFile(uri);
            return { path: p, content: Buffer.from(contentRaw).toString('utf8') };
          } catch {
            return null; 
          }
        }));

        const files = filesWithContent.filter((f): f is { path: string, content: string } => f !== null);
        if (files.length === 0) {
          vscode.window.showWarningMessage('有効なファイルが選択されていません。');
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

        if (root) {
          try {
            const outputFileName = config.get('outputFilePath', 'codeprep-output.txt');
            const outputUri = vscode.Uri.file(path.join(root, outputFileName));
            await vscode.workspace.fs.writeFile(outputUri, Buffer.from(result.content, 'utf8'));
            // 2. ★追加: 保存したファイルを自動で開く
            const doc = await vscode.workspace.openTextDocument(outputUri);
            await vscode.window.showTextDocument(doc, { 
              preview: false, // プレビューモードではなく、正式なタブとして開く
              viewColumn: vscode.ViewColumn.One // メインエディタで開く
            });
            vscode.window.showInformationMessage(`CodePrep: Copied to clipboard & Saved to ${outputFileName}`);
          } catch (err) {
            vscode.window.showErrorMessage(`ファイルの保存に失敗しました: ${err}`);
          }
        }
      });
    }),

    // --- 選択操作 ---
    vscode.commands.registerCommand('codeprep.selectAll', async () => {
      await selectionUseCase.selectAll(workspaceRepo);
      await uiController.refresh();
    }),

    vscode.commands.registerCommand('codeprep.clearAll', async () => {
      selectionUseCase.currentSelection.clear();
      await uiController.refresh();
    }),

    vscode.commands.registerCommand('codeprep.invertSelection', async () => {
      await selectionUseCase.invertSelection(workspaceRepo);
      await uiController.refresh();
    }),

    // --- プリセット ---
    vscode.commands.registerCommand('codeprep.savePreset', async () => {
      const name = await vscode.window.showInputBox({ placeHolder: 'プリセット名を入力' });
      if (name) {
        await selectionUseCase.savePreset(name);
        vscode.window.showInformationMessage(`プリセット "${name}" を保存しました。`);
      }
    }),

    vscode.commands.registerCommand('codeprep.loadPreset', async () => {
      const presets = selectionUseCase.getPresetList();
      const selected = await vscode.window.showQuickPick(presets);
      if (selected) {
        await selectionUseCase.loadPreset(selected);
        await uiController.refresh();
      }
    }),

    // --- プレビュー ---
    vscode.commands.registerCommand('codeprep.preview', async () => {
      const uri = vscode.Uri.parse(`${PreviewProvider.scheme}:preview`);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
    }),
  ];
}
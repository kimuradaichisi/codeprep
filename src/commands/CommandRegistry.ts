import * as vscode from 'vscode';
import * as path from 'path';
import { SelectionUseCase } from '../features/selection/application/SelectionUseCase';
import { PromptUseCase } from '../features/prompt/application/PromptUseCase';
import { OutputEngine } from '../features/engine/domain/OutputEngine';
import { UIController } from '../features/ui/application/UIController';
import { VSCodeWorkspaceRepository } from '../features/selection/infrastructure/VSCodeWorkspaceRepository';
import { GitUtils } from '../utils/git';

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
    vscode.commands.registerCommand('codeprep.selectAll', async () => {
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "CodePrep: Selecting all..." }, async () => {
        await selectionUseCase.selectAll(workspaceRepo);
        await uiController.refresh();
      });
    }),

    vscode.commands.registerCommand('codeprep.clearAll', async () => {
      selectionUseCase.currentSelection.clear();
      await uiController.refresh();
    }),

    vscode.commands.registerCommand('codeprep.selectGitDiff', async () => {
      if (root) {
        await selectionUseCase.selectModifiedFiles(GitUtils, root);
        await uiController.refresh();
      }
    }),

    vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
      const collection = await promptUseCase.getAvailablePrompts();
      const items = collection.all.map(t => ({ label: t.name, description: t.summary }));
      const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a prompt' });
      if (selected) {
        promptUseCase.selectPrompt(selected.label);
        vscode.window.showInformationMessage(`Selected: ${selected.label}`);
      }
    }),

    vscode.commands.registerCommand('codeprep.generate', async () => {
      const paths = selectionUseCase.currentSelection.getPaths();
      if (paths.length === 0) return;

      const files = await Promise.all(paths.map(async p => {
        const uri = vscode.Uri.file(path.join(root || '', p));
        const content = (await vscode.workspace.fs.readFile(uri)).toString();
        return { path: p, content };
      }));

      const config = vscode.workspace.getConfiguration('codeprep');
      const options = {
        format: config.get('outputFormat', 'markdown') as any,
        outputMode: config.get('outputMode', 'everything') as any,
        includeMetadata: config.get('includeMetadata', true),
        removeComments: config.get('removeComments', false),
        includeEmptyLines: config.get('includeEmptyLines', true)
      };

      const promptContent = await promptUseCase.getPromptContent(promptUseCase.getSelectedPrompt() || '');
      const result = engine.generate(files, options, promptContent);
      await vscode.env.clipboard.writeText(result.content);
      vscode.window.showInformationMessage('Copied to clipboard!');
    })
  ];
}
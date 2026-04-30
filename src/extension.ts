import * as vscode from 'vscode';
import { SelectionService } from './services/SelectionService';
import { CommandService } from './services/CommandService';
import { PromptService } from './services/PromptService';
import { TokenService } from './services/TokenService';
import { NativeEngine } from './engines/NativeEngine';
import { FileTreeProvider } from './providers/FileTreeProvider';
import { PreviewProvider } from './providers/PreviewProvider';
import { getRelativePath } from './utils/path';
import { GitUtils } from './utils/git';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
    console.log('CodePrep: Extension is being activated...');
    try {
    const getWorkspaceRoot = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    const selectionService = new SelectionService(context.workspaceState);
    const promptService = new PromptService();
    const tokenService = new TokenService();
    const nativeEngine = new NativeEngine();
    const previewProvider = new PreviewProvider();
    
    const commandService = new CommandService(promptService, nativeEngine, tokenService, previewProvider);
    const treeProvider = new FileTreeProvider(getWorkspaceRoot(), selectionService);

    console.log('CodePrep: Registering TreeView with ID: codeprep.fileTree');
    const treeView = vscode.window.createTreeView('codeprep.fileTree', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
        manageCheckboxStateManually: true
    });

    let statsTimeout: NodeJS.Timeout | undefined;
    const updateStatsDisplay = async () => {
        if (statsTimeout) {
            clearTimeout(statsTimeout);
        }

        statsTimeout = setTimeout(async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', true);
                tokenService.updateStatistics([]);
                return;
            }

            const selectedPaths = Array.from(selectionService.getSelection());
            await vscode.commands.executeCommand('setContext', 'codeprep.selectionEmpty', selectedPaths.length === 0);

            const files: { path: string; size: number }[] = [];
            for (const relPath of selectedPaths) {
                try {
                    const fullPath = path.join(root, relPath);
                    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                    files.push({ path: relPath, size: stat.size });
                } catch { /* ignore */ }
            }
            tokenService.updateStatistics(files);
        }, 300); // 300ms デバウンス
    };

    const updateButtonContexts = async () => {
        const config = vscode.workspace.getConfiguration('codeprep');
        const visibleButtons = config.get<string[]>('visibleButtons', []);
        
        const buttonContextMap: Record<string, string> = {
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

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(PreviewProvider.scheme, previewProvider),

        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            treeProvider.setRoot(getWorkspaceRoot());
            updateStatsDisplay();
        }),

        treeView.onDidChangeCheckboxState(async (event) => {
            const isChecked = (state: vscode.TreeItemCheckboxState) => 
                state === vscode.TreeItemCheckboxState.Checked || (state as any) === 1;

            const updateRecursive = async (node: any, checked: boolean) => {
                selectionService.setSelection(node.relativePath, checked);
                if (node.isDirectory) {
                    const children = await treeProvider.getChildren(node);
                    for (const child of children) {
                        await updateRecursive(child, checked);
                    }
                }
            };

            for (const [node, state] of event.items) {
                await updateRecursive(node as any, isChecked(state));
            }
            
            treeProvider.refresh();
            await updateStatsDisplay();
        }),

        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('codeprep.visibleButtons')) {
                await updateButtonContexts();
            }
            if (e.affectsConfiguration('codeprep.autoRefreshTree')) {
                treeProvider.updateWatcher();
            }
            if (e.affectsConfiguration('codeprep.excludePatterns') || e.affectsConfiguration('codeprep.exclude')) {
                treeProvider.refresh();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('codeprep.selectAll', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                vscode.window.showErrorMessage('CodePrep: Please open a folder first.');
                return;
            }
            const allFiles = await getAllWorkspaceFiles(root);
            selectionService.clear();
            selectionService.addAll(allFiles);
            treeProvider.refresh();
            await updateStatsDisplay();
        }),

        vscode.commands.registerCommand('codeprep.clearAll', async () => {
            selectionService.clear();
            treeProvider.refresh();
            await updateStatsDisplay();
        }),

        vscode.commands.registerCommand('codeprep.selectGitDiff', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                vscode.window.showErrorMessage('CodePrep: Please open a folder first.');
                return;
            }
            try {
                const modifiedFiles = await GitUtils.getModifiedFiles(root);
                if (modifiedFiles.length === 0) {
                    vscode.window.showInformationMessage('No modified files found in Git.');
                    return;
                }
                await selectionService.selectFiles(modifiedFiles);
                treeProvider.refresh();
                await updateStatsDisplay();
                vscode.window.showInformationMessage('CodePrep: Selected files modified in Git.');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Git Error: ${error.message}`);
            }
        }),

        vscode.commands.registerCommand('codeprep.selectPrompt', async () => {
            await promptService.selectPrompt();
        }),

        vscode.commands.registerCommand('codeprep.generate', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                vscode.window.showErrorMessage('CodePrep: Please open a folder first.');
                return;
            }
            const selectedPaths = Array.from(selectionService.getSelection());
            if (selectedPaths.length === 0) {
                vscode.window.showWarningMessage('CodePrep: No files selected.');
                return;
            }
            await commandService.execute(root, selectedPaths);
        }),

        vscode.commands.registerCommand('codeprep.savePreset', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Enter preset name' });
            if (name) {
                await selectionService.savePreset(name);
                vscode.window.showInformationMessage(`Preset "${name}" saved.`);
            }
        }),

        vscode.commands.registerCommand('codeprep.loadPreset', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                vscode.window.showErrorMessage('CodePrep: Please open a folder first.');
                return;
            }
            const presets = selectionService.getPresetList();
            if (presets.length === 0) {
                vscode.window.showInformationMessage('CodePrep: No presets found.');
                return;
            }
            const selected = await vscode.window.showQuickPick(presets, { placeHolder: 'Select a preset to load' });
            if (selected) {
                await selectionService.loadPreset(selected, root);
                treeProvider.refresh();
                await updateStatsDisplay();
            }
        }),

        vscode.commands.registerCommand('codeprep.exportPresets', async () => {
            const presets = promptService.getAllPresets();
            if (Object.keys(presets).length === 0) {
                vscode.window.showInformationMessage('No custom prompts to export.');
                return;
            }
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('codeprep-prompts.json'),
                filters: { 'JSON': ['json'] }
            });
            if (uri) {
                const content = JSON.stringify({ version: '1.0', prompts: presets }, null, 2);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage('Presets exported successfully.');
            }
        }),

        vscode.commands.registerCommand('codeprep.importPresets', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'JSON': ['json'] }
            });
            if (uris && uris[0]) {
                try {
                    const fileContent = await vscode.workspace.fs.readFile(uris[0]);
                    const data = JSON.parse(Buffer.from(fileContent).toString('utf8'));
                    if (data.prompts) {
                        await promptService.importPresets(data.prompts);
                        vscode.window.showInformationMessage('Presets imported successfully.');
                    } else {
                        throw new Error('Invalid format: missing "prompts" key.');
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage(`Import failed: ${e.message}`);
                }
            }
        }),

        vscode.commands.registerCommand('codeprep.invertSelection', async () => {
            const root = getWorkspaceRoot();
            if (!root) {
                vscode.window.showErrorMessage('CodePrep: Please open a folder first.');
                return;
            }
            const allFiles = await getAllWorkspaceFiles(root);
            selectionService.invert(allFiles);
            treeProvider.refresh();
            await updateStatsDisplay();
        }),

        vscode.commands.registerCommand('codeprep.addToSelection', async (uri: vscode.Uri) => {
            const root = getWorkspaceRoot();
            if (!root || !uri) return;
            const relPath = getRelativePath(root, uri.fsPath);
            selectionService.setSelection(relPath, true);
            treeProvider.refresh();
            await updateStatsDisplay();
        }),

        vscode.commands.registerCommand('codeprep.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codeprep.codeprep-vscode');
        }),

        vscode.commands.registerCommand('codeprep.expandAll', () => {
            treeProvider.setExpandAll(true);
            // Reset flag after a short delay so subsequent manual collapses work
            setTimeout(() => treeProvider.setExpandAll(false), 500);
        }),

        treeView,
        tokenService
    );

    updateButtonContexts();
    setImmediate(() => {
        updateStatsDisplay();
    });
    } catch (error: any) {
        vscode.window.showErrorMessage(`CodePrep Activation Error: ${error.message}`);
        console.error('CodePrep Activation Error:', error);
    }
}

async function getAllWorkspaceFiles(workspaceRoot: string): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('codeprep');
    const excludes = config.get<string[]>('exclude', []);
    const excludePattern = `{${excludes.join(',')}}`;
    const files = await vscode.workspace.findFiles('**/*', excludePattern);
    return files.map(f => getRelativePath(workspaceRoot, f.fsPath));
}

export function deactivate() {}

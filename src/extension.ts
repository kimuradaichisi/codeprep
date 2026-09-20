import * as vscode from 'vscode';
import { Selection } from './features/selection/domain/Selection';
import { SelectionUseCase } from './features/selection/application/SelectionUseCase';
import { VSCodeSelectionRepository } from './features/selection/infrastructure/VSCodeSelectionRepository';
import { VSCodeFileValidator } from './features/selection/infrastructure/VSCodeFileValidator';
import { VSCodeWorkspaceRepository } from './features/selection/infrastructure/VSCodeWorkspaceRepository';
import { GitWatcher } from './features/selection/infrastructure/GitWatcher';
import { OutputEngine } from './features/engine/domain/OutputEngine';
import { SkeletonService } from './features/engine/infrastructure/SkeletonService';
import { TokenUseCase } from './features/token/application/TokenUseCase';
import { VSCodeStatusBarPresenter } from './features/token/infrastructure/VSCodeStatusBarPresenter';
import { PromptUseCase } from './features/prompt/application/PromptUseCase';
import { VSCodePromptRepository } from './features/prompt/infrastructure/VSCodePromptRepository';
import { FileTreeProvider } from './features/ui/FileTreeProvider';
import { FileNode } from './features/ui/models/FileNode';
import { PreviewProvider } from './features/ui/PreviewProvider';
import { UIController } from './features/ui/application/UIController';
import { registerAllCommands, RegistryDeps } from './commands/CommandRegistry';
import { VSCodeFileSystem } from './shared/infrastructure/VSCodeFileSystem';
import { GitCliClient } from './features/git/infrastructure/GitCliClient';
import { PatchUseCase } from './features/patch/application/PatchUseCase';
import { VSCodeClipboard } from './features/patch/infrastructure/VSCodeClipboard';
import { PatchPreviewProvider } from './features/patch/infrastructure/PatchPreviewProvider';

interface Repositories {
  selectionRepo: VSCodeSelectionRepository;
  workspaceRepo: VSCodeWorkspaceRepository;
  promptRepo: VSCodePromptRepository;
}

interface UseCases {
  selectionUseCase: SelectionUseCase;
  promptUseCase: PromptUseCase;
  tokenPresenter: VSCodeStatusBarPresenter;
  tokenUseCase: TokenUseCase;
  patchUseCase: PatchUseCase;
  engine: OutputEngine;
}

interface Services extends Repositories, UseCases {
  selection: Selection;
  fileSystem: VSCodeFileSystem;
  gitClient: GitCliClient;
  gitWatcher: GitWatcher | undefined;
  treeProvider: FileTreeProvider;
  uiController: UIController;
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    const rootFolder = vscode.workspace.workspaceFolders?.[0];
    const rootUri = rootFolder?.uri;
    const root = rootUri ? (rootUri.scheme === 'file' ? rootUri.fsPath : rootUri.path) : undefined;
    const services = initServices(context, root, rootUri);
    const treeView = setupTreeView(services.treeProvider);
    const commands = registerAllCommands(buildRegistryDeps(context, services, root));
    registerEvents(context, services, treeView, commands);
    await services.uiController.updateButtonContexts();
    setTimeout(() => services.uiController.refresh(), 1000);
  } catch (error) {
    console.error('CodePrep activation failed:', error);
  }
}

function buildRegistryDeps(context: vscode.ExtensionContext, s: Services, root: string | undefined): RegistryDeps {
  return {
    context, root,
    selectionUseCase: s.selectionUseCase,
    promptUseCase: s.promptUseCase,
    uiController: s.uiController,
    engine: s.engine,
    workspaceRepo: s.workspaceRepo,
    fileSystem: s.fileSystem,
    gitClient: s.gitClient,
    patchUseCase: s.patchUseCase
  };
}

function initServices(context: vscode.ExtensionContext, root: string | undefined, rootUri?: vscode.Uri): Services {
  const fileSystem = new VSCodeFileSystem(rootUri);
  const gitClient = new GitCliClient();
  const gitWatcher = root ? new GitWatcher(root, gitClient) : undefined;
  const selection = new Selection();
  const repos = createRepositories(context, root, rootUri);
  const useCases = createUseCases(root, selection, repos, gitWatcher, fileSystem);
  const treeProvider = new FileTreeProvider(root, selection, fileSystem, { gitWatcher, rootUri });
  const uiController = new UIController({ selection, tokenUseCase: useCases.tokenUseCase, treeProvider, fileSystem, root, gitWatcher });
  return { selection, ...useCases, ...repos, fileSystem, gitClient, gitWatcher, treeProvider, uiController };
}

function createRepositories(context: vscode.ExtensionContext, root: string | undefined, rootUri?: vscode.Uri): Repositories {
  return {
    selectionRepo: new VSCodeSelectionRepository(context.workspaceState),
    workspaceRepo: new VSCodeWorkspaceRepository(root || '', rootUri),
    promptRepo: new VSCodePromptRepository()
  };
}


function createUseCases(root: string | undefined, selection: Selection, repos: Repositories, gitWatcher: GitWatcher | undefined, fileSystem: VSCodeFileSystem): UseCases {
  const selectionUseCase = new SelectionUseCase(selection, repos.selectionRepo, new VSCodeFileValidator(root || ''), gitWatcher);
  const promptUseCase = new PromptUseCase(repos.promptRepo);
  const tokenPresenter = new VSCodeStatusBarPresenter();
  const tokenUseCase = new TokenUseCase(tokenPresenter);
  const patchUseCase = new PatchUseCase(new VSCodeClipboard(), fileSystem);
  return { selectionUseCase, promptUseCase, tokenPresenter, tokenUseCase, patchUseCase, engine: new OutputEngine(new SkeletonService()) };
}

function setupTreeView(treeProvider: FileTreeProvider): vscode.TreeView<FileNode> {
  return vscode.window.createTreeView('codeprep.fileTree', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    manageCheckboxStateManually: true
  });
}

function registerEvents(context: vscode.ExtensionContext, services: Services, treeView: vscode.TreeView<FileNode>, commands: vscode.Disposable[]): void {
  if (services.gitWatcher) context.subscriptions.push(services.gitWatcher);
  context.subscriptions.push(
    treeView, services.tokenPresenter, ...commands,
    vscode.workspace.registerTextDocumentContentProvider(PreviewProvider.scheme, new PreviewProvider()),
    vscode.workspace.registerTextDocumentContentProvider(PatchPreviewProvider.scheme, new PatchPreviewProvider()),
    vscode.workspace.onDidChangeConfiguration(e => handleConfigChange(e, services)),
    treeView.onDidChangeCheckboxState(e => handleCheckboxChange(e, services))
  );
}

async function handleConfigChange(e: vscode.ConfigurationChangeEvent, services: Services): Promise<void> {
  if (e.affectsConfiguration('codeprep.visibleButtons')) await services.uiController.updateButtonContexts();
  if (e.affectsConfiguration('codeprep.exclude')) services.treeProvider.refresh();
}

async function handleCheckboxChange(e: vscode.TreeCheckboxChangeEvent<FileNode>, services: Services): Promise<void> {
  for (const [node, state] of e.items) {
    const isChecked = state === vscode.TreeItemCheckboxState.Checked;
    if (node.isDirectory) {
      await services.selectionUseCase.updateDirectorySelection(services.workspaceRepo, node.relativePath, isChecked);
    } else {
      services.selection.set(node.relativePath, isChecked);
    }
  }
  await services.uiController.refresh();
}

export function deactivate() {}
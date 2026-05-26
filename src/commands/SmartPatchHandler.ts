/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';
import { IGitClient } from '../features/git/domain/IGitClient';
import { SmartPatchUseCase, FileSystemLike } from '../features/patch/application/SmartPatchUseCase';
import { PatchPlan, PatchPlanPresenter } from './PatchPlanPresenter';

export class SmartPatchHandler {
  private readonly presenter = new PatchPlanPresenter();

  constructor(
    private readonly root: string | undefined,
    private readonly gitClient?: IGitClient
  ) {}

  async handle(): Promise<void> {
    const text = await this.readClipboard();
    if (!text) return;

    const workspaceFiles = await this.collectWorkspaceFiles();
    const recentFiles = await this.collectRecentFiles(workspaceFiles);
    const smart = new SmartPatchUseCase(this.buildFsLike(), workspaceFiles, recentFiles);
    const rawPlans = await smart.planFromText(text);
    if (!rawPlans || rawPlans.length === 0) {
      vscode.window.showInformationMessage(t('noPatchCandidates'));
      return;
    }
    const plans: PatchPlan[] = rawPlans.map(p => ({
      targetPath: p.targetPath,
      diff: p.diff,
      description: `${p.confidence.level} (${Math.round(p.confidence.score)})`
    }));
    await this.presenter.showAndOpen(plans);
  }

  private async readClipboard(): Promise<string | null> {
    const text = await vscode.env.clipboard.readText();
    if (!text || text.trim() === '') {
      vscode.window.showWarningMessage(t('noClipboardText'));
      return null;
    }
    return text;
  }

  private async collectWorkspaceFiles(): Promise<string[]> {
    try {
      const uris = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
      const rootPrefix = this.root
        ? (this.root.endsWith('/') ? this.root : this.root + path.sep)
        : undefined;
      return uris.map(u => u.fsPath).filter(p => !rootPrefix || p.startsWith(rootPrefix));
    } catch {
      return [];
    }
  }

  private buildFsLike(): FileSystemLike {
    return {
      readFile: async (p: string) => {
        try {
          const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(p));
          return new TextDecoder().decode(bytes);
        } catch {
          return '';
        }
      }
    };
  }

  private async collectRecentFiles(workspaceFiles: string[]): Promise<string[]> {
    const byMtime = await this.collectRecentByMtime(workspaceFiles);
    return this.supplementWithGit(byMtime, workspaceFiles);
  }

  private async collectRecentByMtime(wsFiles: string[]): Promise<string[]> {
    try {
      const stats = await Promise.all(wsFiles.map(async p => {
        try {
          const s = await vscode.workspace.fs.stat(vscode.Uri.file(p));
          return { p, mtime: s.mtime };
        } catch {
          return { p, mtime: 0 };
        }
      }));
      return stats.sort((a, b) => b.mtime - a.mtime).slice(0, 50).map(s => s.p);
    } catch {
      return [];
    }
  }

  private async supplementWithGit(recent: string[], wsFiles: string[]): Promise<string[]> {
    try {
      if (!this.gitClient || !this.root) return recent;
      const gitRes = await this.gitClient.getRecentFiles(this.root, 200);
      if (!gitRes.isSuccess) return recent;
      const abs = gitRes.value.map(p => path.join(this.root!, p));
      const merged = [...recent];
      for (const a of abs) {
        if (!merged.includes(a) && wsFiles.includes(a)) merged.unshift(a);
      }
      return Array.from(new Set(merged)).slice(0, 200);
    } catch {
      return recent;
    }
  }
}

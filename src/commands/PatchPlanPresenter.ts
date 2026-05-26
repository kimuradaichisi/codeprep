/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import { t } from '../utils/i18n';
import { PatchCache } from '../features/patch/domain/PatchCache';

export type PatchPlan = { targetPath?: string; diff: string; description?: string };

export class PatchPlanPresenter {
  async showAndOpen(plans: PatchPlan[]): Promise<void> {
    const items = this.buildItems(plans);
    const pick = await vscode.window.showQuickPick(items, {
      placeHolder: t('patch.selectPatchCandidate') || 'Select patch candidate to preview'
    });
    if (!pick) return;
    await this.openSelected(pick, plans, items);
  }

  private buildItems(plans: PatchPlan[]): vscode.QuickPickItem[] {
    const planItems: vscode.QuickPickItem[] = plans.map((p, idx) => ({
      label: p.targetPath || `<unknown:${idx}>`,
      description: p.description ?? '',
      detail: p.diff.split('\n').slice(0, 3).join('\n')
    }));
    const openAll: vscode.QuickPickItem = {
      label: `$(list-selection) ${t('patch.openAll')}`,
      description: t('patch.openAllDescription', String(plans.length)),
      detail: t('patch.openAllDescription', String(plans.length))
    };
    return [openAll, ...planItems];
  }

  private async openSelected(
    pick: vscode.QuickPickItem,
    plans: PatchPlan[],
    items: vscode.QuickPickItem[]
  ): Promise<void> {
    if (pick.label.startsWith('$(list-selection)')) {
      for (let i = 0; i < plans.length; i++) await this.openPlanPreview(plans[i], i);
      return;
    }
    const selIndex = items.findIndex(it => it === pick) - 1;
    await this.openPlanPreview(plans[selIndex >= 0 ? selIndex : 0], selIndex >= 0 ? selIndex : 0);
  }

  async openPlanPreview(plan: PatchPlan, index: number): Promise<void> {
    const id = PatchCache.generateId();
    PatchCache.set(id, plan.diff.replace(/\r\n/g, '\n'));
    const uri = vscode.Uri.parse(`codeprep-patch:preview-${index}?id=${id}`);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  }
}

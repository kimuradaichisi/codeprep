/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { t } from '../utils/i18n';
import { ClipParser } from '../features/patch/domain/ClipParser';
import { OmitHealer } from '../features/patch/domain/OmitHealer';
import { PatchDiffBuilder } from '../features/patch/domain/PatchDiffBuilder';
import { ParsedPatch } from '../features/patch/domain/ParsedPatch';
import { PatchPlan, PatchPlanPresenter } from './PatchPlanPresenter';

export class LegacyPatchHandler {
  private readonly presenter = new PatchPlanPresenter();
  private readonly parser = new ClipParser();
  private readonly healer = new OmitHealer();
  private readonly diffBuilder = new PatchDiffBuilder();

  constructor(private readonly root: string | undefined) {}

  async handle(): Promise<void> {
    const text = await this.readClipboard();
    if (!text) return;

    const parsed = this.parser.parse(text);
    if (parsed.isFailure || parsed.value.length === 0) {
      vscode.window.showInformationMessage(t('noPatchCandidates'));
      return;
    }
    const plans = await this.buildAllPlans(parsed.value);
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

  private async buildAllPlans(blocks: ParsedPatch[]): Promise<PatchPlan[]> {
    const plans: PatchPlan[] = [];
    for (const block of blocks) {
      plans.push(await this.buildPlanForBlock(block));
    }
    return plans;
  }

  private async buildPlanForBlock(block: ParsedPatch): Promise<PatchPlan> {
    const original = await this.readOriginal(block.filePath);
    const healed = this.healer.heal(original, block.code);
    const patched = healed.isSuccess ? healed.value.code : block.code;
    const diff = this.diffBuilder.buildUnifiedDiff(block.filePath, original, patched);
    return { targetPath: block.filePath, diff };
  }

  private async readOriginal(filePath: string): Promise<string> {
    if (!this.root) return '';
    try {
      const fp = path.join(this.root, filePath);
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(fp));
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }
}

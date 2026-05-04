import * as vscode from 'vscode';
import { IClipboard } from '../domain/IClipboard';
import { Result, ok, fail } from '../../../shared/domain/Result';

export class VSCodeClipboard implements IClipboard {
  public async readText(): Promise<Result<string>> {
    try {
      const text = await vscode.env.clipboard.readText();
      return ok(text);
    } catch (error) {
      return fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

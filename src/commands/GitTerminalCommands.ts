/*
 * Copyright 2026 CodePrep Contributors
 */
import * as vscode from 'vscode';

export class GitTerminalCommands {
  constructor(private readonly root: string | undefined) {}

  prepareGitForPatch(): vscode.Disposable {
    return vscode.commands.registerCommand('codeprep.prepareGitForPatch', () => this.runPrepare());
  }

  finalizePatchCommit(): vscode.Disposable {
    return vscode.commands.registerCommand('codeprep.finalizePatchCommit', () => this.runFinalize());
  }

  private runPrepare(): void {
    const branch = this.generateBranchName();
    const term = vscode.window.createTerminal({ name: 'CodePrep: Prepare Patch', cwd: this.root });
    term.show(true);
    term.sendText(this.buildPrepareScript(branch), false);
  }

  private runFinalize(): void {
    const term = vscode.window.createTerminal({ name: 'CodePrep: Finalize Patch Commit', cwd: this.root });
    term.show(true);
    term.sendText(`git add -A\ngit commit -m "Apply smart patch: <summary here>"\n# Optionally: git push origin HEAD`, false);
  }

  private generateBranchName(): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    return `patch/auto-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  private buildPrepareScript(branch: string): string {
    if (process.platform === 'win32') {
      return `$branch = "${branch}"\n$null = Write-Host "Suggested commands (run when ready):"\ngit stash push -m "pre-patch:$branch"\ngit checkout -b $branch`;
    }
    return `branch=${branch}\necho "Suggested commands (run when ready):"\ngit stash push -m "pre-patch:$branch"\ngit checkout -b "$branch"`;
  }
}

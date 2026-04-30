import * as vscode from 'vscode';
import * as path from 'path';

export class SelectionService {
    private selectedFiles: Set<string> = new Set();
    private readonly PRESET_KEY_PREFIX = 'codeprep.preset.';
    private readonly PRESET_LIST_KEY = 'codeprep.presets';

    constructor(private workspaceState: vscode.Memento) {}

    public setSelection(filePath: string, selected: boolean): void {
        if (selected) {
            this.selectedFiles.add(filePath);
        } else {
            this.selectedFiles.delete(filePath);
        }
    }

    public addAll(paths: string[]): void {
        for (const p of paths) {
            this.selectedFiles.add(p);
        }
    }

    public isSelected(path: string): boolean {
        return this.selectedFiles.has(path);
    }

    public getSelection(): Set<string> {
        return this.selectedFiles;
    }

    public clear(): void {
        this.selectedFiles.clear();
    }

    public invert(allRelativePaths: string[]): void {
        const nextSelection = new Set<string>();
        for (const p of allRelativePaths) {
            if (!this.selectedFiles.has(p)) {
                nextSelection.add(p);
            }
        }
        this.selectedFiles = nextSelection;
    }

    public async savePreset(name: string): Promise<void> {
        const paths = Array.from(this.selectedFiles);
        await this.workspaceState.update(this.PRESET_KEY_PREFIX + name, paths);
        const presets = this.getPresetList();
        if (!presets.includes(name)) {
            presets.push(name);
            await this.workspaceState.update(this.PRESET_LIST_KEY, presets);
        }
    }

    public async loadPreset(name: string, workspaceRoot: string): Promise<boolean> {
        const paths = this.workspaceState.get<string[]>(this.PRESET_KEY_PREFIX + name);
        if (!paths) return false;

        this.clear();
        const config = vscode.workspace.getConfiguration('codeprep');
        const excludePatterns = config.get<string[]>('exclude') || [];
        
        // Parallelized validation for performance
        const results = await Promise.all(paths.map(async p => {
            const valid = await this._isValid(p, workspaceRoot, excludePatterns);
            return { path: p, valid };
        }));

        for (const res of results) {
            if (res.valid) {
                this.selectedFiles.add(res.path);
            }
        }
        return true;
    }

    private async _isValid(filePath: string, workspaceRoot: string, excludePatterns: string[]): Promise<boolean> {
        try {
            const fullPath = path.join(workspaceRoot, filePath);
            await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
        } catch {
            return false;
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        const pathParts = normalizedPath.split('/');
        for (const pattern of excludePatterns) {
            const p = pattern.replace(/\\/g, '/');
            const segments = p.split('/').filter(s => s !== '**' && s !== '');
            if (segments.some(seg => pathParts.includes(seg))) {
                return false;
            }
        }

        return true;
    }

    public getPresetList(): string[] {
        return this.workspaceState.get<string[]>(this.PRESET_LIST_KEY, []);
    }

    public async selectFiles(files: string[]): Promise<void> {
        this.clear();
        this.addAll(files);
    }
}

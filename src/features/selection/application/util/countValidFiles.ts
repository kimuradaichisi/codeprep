export function countValidFiles(files: Array<{ path: string; content: string | null | undefined }>): number {
    return files.filter(f => typeof f.content === 'string' && f.content.length > 0).length;
}

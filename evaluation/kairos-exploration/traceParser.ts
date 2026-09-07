// evaluation/kairos-exploration/traceParser.ts
import type { ExplorationMetrics, ParsedToolEvent, ToolCallKind } from './types';

function classifyCommand(cmd: string): ToolCallKind {
  const c = cmd.toLowerCase().trim();
  if (c.startsWith('git')) return 'git';
  if (c.startsWith('rg') || c.startsWith('grep') || c.includes('find')) return 'search';
  if (c.startsWith('ls') || c.startsWith('dir')) return 'list';
  if (c.startsWith('cat') || c.startsWith('head') || c.startsWith('tail')) return 'read';
  return 'other';
}

export function classifyTool(name: string, input: Record<string, unknown>): { kind: ToolCallKind; target?: string } {
  if (name.includes('codeprep')) return { kind: 'mcp' };
  if (name === 'Read') return { kind: 'read', target: String(input.file_path || '') };
  if (name === 'Glob' || name === 'Grep') return { kind: 'search', target: String(input.pattern || '') };
  if (name === 'Bash' || name === 'PowerShell') {
    const cmd = String(input.command || '');
    return { kind: classifyCommand(cmd), target: cmd.split(/\s+/).pop() };
  }
  return { kind: 'other' };
}

export function parseToolEvents(lines: readonly string[]): ParsedToolEvent[] {
  const events: ParsedToolEvent[] = [];
  let seq = 0;
  for (const line of lines) {
    if (!line.trim().startsWith('{')) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const msg = obj.message as Record<string, unknown> | undefined;
      const content = msg && Array.isArray(msg.content) ? (msg.content as readonly unknown[]) : [];
      for (const item of content) {
        const blk = item as Record<string, unknown>;
        if (blk?.type === 'tool_use') {
          const { kind, target } = classifyTool(String(blk.name || ''), (blk.input as Record<string, unknown>) || {});
          events.push({ sequence: ++seq, kind, toolName: String(blk.name || ''), target, rawInput: JSON.stringify(blk.input || {}) });
        }
      }
    } catch {}
  }
  return events;
}

export function extractFinalAnswer(lines: readonly string[]): string {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{')) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      if (obj.type === 'assistant' && typeof obj.content === 'string') return obj.content;
      const msg = obj.message as Record<string, unknown> | undefined;
      if (msg && Array.isArray(msg.content)) {
        const parts = (msg.content as readonly Record<string, unknown>[])
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => String(c.text));
        if (parts.length > 0) return parts.join('\n');
      }
    } catch {}
  }
  return '';
}


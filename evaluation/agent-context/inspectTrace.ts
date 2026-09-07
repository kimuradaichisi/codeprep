// evaluation/agent-context/inspectTrace.ts
import { readFileSync } from 'fs';
import { parseCodexEvents } from './parseTrace';

function show(file: string, label: string) {
  const lines = readFileSync(file, 'utf-8').split('\n');
  const events = parseCodexEvents(lines);
  console.log(`=== ${label} total events: ${events.length} ===`);
  events.slice(0, 15).forEach((e) => {
    console.log(`${e.sequence}: [${e.kind}] ${e.toolName} -> ${e.target || ''} (beforeEdit: ${e.isBeforeFirstEdit}, postPack: ${e.isPostPack})`);
  });
}

show('evaluation/agent-context/traces/TASK-02-codeprep.jsonl', 'TASK-02 CodePrep');

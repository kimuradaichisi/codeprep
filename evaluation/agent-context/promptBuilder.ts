// evaluation/agent-context/promptBuilder.ts
import type { TaskDefinition, TrialCondition } from './types';

const BASE_INSTRUCTION = `Implement the following task in this repository.
Before editing, identify the relevant repository context.
Follow the repository's existing development rules.
Run the required quality gates.`;

const TREATMENT_INSTRUCTION = `Use the CodePrep MCP repository-context tools before manual repository exploration.
Inspect candidates and evidence, choose the entry point(s), then request a context pack.
You may perform additional repository exploration if necessary.`;

const FAST_PATH_INSTRUCTION = `Use the CodePrep MCP tool 'codeprep_prepare_context' before manual exploration.
If confidence is HIGH, it automatically provides the Fast Context Pack with complete source code—you can proceed directly to implementation without redundant manual file reads.
If confidence is MEDIUM or LOW, review the candidates and evidence, select the entry point(s), and call 'codeprep_build_context_pack'.
You may perform additional repository exploration if necessary.`;

export function buildPrompt(task: TaskDefinition, condition: TrialCondition): string {
  if (condition === 'codeprep-fastpath') {
    return `${BASE_INSTRUCTION}\n\n<Task>\n${task.task}\n</Task>\n\n${FAST_PATH_INSTRUCTION}`;
  }
  const treatment = condition === 'codeprep' ? `\n\n${TREATMENT_INSTRUCTION}` : '';
  return `${BASE_INSTRUCTION}\n\n<Task>\n${task.task}\n</Task>${treatment}`;
}


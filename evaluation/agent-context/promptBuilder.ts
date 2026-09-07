// evaluation/agent-context/promptBuilder.ts
import type { TaskDefinition, TrialCondition } from './types';

const BASE_INSTRUCTION = `Implement the following task in this repository.
Before editing, identify the relevant repository context.
Follow the repository's existing development rules.
Run the required quality gates.`;

const TREATMENT_INSTRUCTION = `Use the CodePrep MCP repository-context tools before manual repository exploration.
Inspect candidates and evidence, choose the entry point(s), then request a context pack.
You may perform additional repository exploration if necessary.`;

export function buildPrompt(task: TaskDefinition, condition: TrialCondition): string {
  const treatment = condition === 'codeprep' ? `\n\n${TREATMENT_INSTRUCTION}` : '';
  return `${BASE_INSTRUCTION}\n\n<Task>\n${task.task}\n</Task>${treatment}`;
}

// apps/desktop/TaskContextPackLoader.ts
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';
import type { DesktopContextFile } from '../../src/features/repository-context/application/ports';
import type { AdaptivePackMode } from '../../src/features/repository-context/domain/ContextConfidence';
import { readProjectFile } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { DesktopContextFormatter } from '../../src/features/repository-context/infrastructure/formatting/DesktopContextFormatter';
import { buildTaskContextPromptHeader } from './TaskContextPromptHeader';

export const loadPackContent = async (
  project: Project,
  entries: readonly ContextEntry[],
  task?: string,
  strategy: AdaptivePackMode = 'standard',
): Promise<string> => {
  const files: DesktopContextFile[] = [];
  for (const entry of entries) {
    const content = await readProjectFile(project, entry.relativePath);
    if (content !== undefined) {
      files.push({ relativePath: entry.relativePath, content });
    }
  }
  const formatter = new DesktopContextFormatter();
  const rawBody = formatter.format({ format: 'markdown', files });
  if (!task) return rawBody;
  const header = buildTaskContextPromptHeader(task, strategy, entries);
  return header + rawBody;
};

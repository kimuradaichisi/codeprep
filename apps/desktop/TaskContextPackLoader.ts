// apps/desktop/TaskContextPackLoader.ts
import type { Project } from '../../src/features/repository-context/domain/Project';
import type { ContextEntry } from '../../src/features/repository-context/domain/ContextEntry';
import type { DesktopContextFile } from '../../src/features/repository-context/application/ports';
import { readProjectFile } from '../../src/features/repository-context/infrastructure/filesystem/ProjectFileContentReader';
import { DesktopContextFormatter } from '../../src/features/repository-context/infrastructure/formatting/DesktopContextFormatter';

export const loadPackContent = async (
  project: Project,
  entries: readonly ContextEntry[],
): Promise<string> => {
  const files: DesktopContextFile[] = [];
  for (const entry of entries) {
    const content = await readProjectFile(project, entry.relativePath);
    if (content !== undefined) {
      files.push({ relativePath: entry.relativePath, content });
    }
  }
  const formatter = new DesktopContextFormatter();
  return formatter.format({ format: 'markdown', files });
};

import type { ProjectFilePort, RecommendationSourcePort } from '../desktop-core/application/ports';
import { createRecommendation, type RecommendationRecord } from '../desktop-core/domain/Recommendation';
import type { Project } from '../desktop-core/domain/Project';

export class DirectoryProximityClient implements RecommendationSourcePort {
  public constructor(private readonly files: ProjectFilePort) {}

  public async recommend(project: Project, relativePath: string): Promise<readonly RecommendationRecord[]> {
    const normalized = normalize(relativePath);
    const directory = parentDirectory(normalized);
    const entries = await this.files.list(project);
    return entries
      .map(entry => normalize(entry.relativePath))
      .filter(path => path !== normalized && parentDirectory(path) === directory)
      .map(path => toRecommendation(project, path, normalized));
  }
}

const normalize = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '');

const parentDirectory = (value: string): string => {
  const separator = value.lastIndexOf('/');
  return separator < 0 ? '' : value.slice(0, separator);
};

const toRecommendation = (project: Project, relativePath: string, sourcePath: string): RecommendationRecord => {
  const recommendation = createRecommendation({
    projectId: project.id,
    relativePath,
    source: 'directoryProximity',
    score: 0.5,
    detail: `Same directory as ${sourcePath}`,
  });
  if (!recommendation) throw new Error('Invalid directory recommendation.');
  return recommendation;
};

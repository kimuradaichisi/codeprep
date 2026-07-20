import type {
  FileContentPort,
  ProjectFilePort,
  RecommendationSourcePort,
} from '../desktop-core/application/ports';
import { createRecommendation, type RecommendationRecord } from '../desktop-core/domain/Recommendation';
import type { Project } from '../desktop-core/domain/Project';
import {
  extractMarkdownRecommendations,
  extractNameHeadingRecommendations,
  readMarkdownContents,
} from './MarkdownRecommendationExtraction';

export type MarkdownRecommendation = Readonly<{
  relativePath: string;
  score: number;
  detail: string;
}>;

export { extractMarkdownRecommendations, extractNameHeadingRecommendations } from './MarkdownRecommendationExtraction';

export class MarkdownRecommendationClient implements RecommendationSourcePort {
  public constructor(
    private readonly fileContent: FileContentPort,
    private readonly files: ProjectFilePort,
    private readonly mode: 'all' | 'markdownLink' | 'nameHeading' = 'all',
  ) {}

  public async recommend(project: Project, relativePath: string): Promise<readonly RecommendationRecord[]> {
    const content = await this.fileContent.read(project, relativePath);
    if (content === undefined) return [];
    const availablePaths = (await this.files.list(project)).map(file => file.relativePath);
    const contents = await readMarkdownContents(this.fileContent, project, availablePaths);
    const links = extractMarkdownRecommendations(content, relativePath, availablePaths);
    const headings = extractNameHeadingRecommendations(relativePath, availablePaths, contents, content);
    const items = mergeRecommendations(links, headings).filter(item => this.includes(item));
    return toReadableRecommendations(project, items, this.fileContent);
  }

  private includes(item: MarkdownRecommendation): boolean {
    if (this.mode === 'all') return true;
    return this.mode === 'nameHeading'
      ? item.detail.startsWith('Filename or heading')
      : !item.detail.startsWith('Filename or heading');
  }
}

const mergeRecommendations = (
  links: readonly MarkdownRecommendation[],
  headings: readonly MarkdownRecommendation[],
): readonly MarkdownRecommendation[] => {
  const linked = new Set(links.map(item => item.relativePath));
  return [...links, ...headings.filter(item => !linked.has(item.relativePath))];
};

const toReadableRecommendations = async (
  project: Project,
  items: readonly MarkdownRecommendation[],
  fileContent: FileContentPort,
): Promise<readonly RecommendationRecord[]> => {
  const readable = await Promise.all(items.map(async item =>
    (await fileContent.canRead(project, item.relativePath)) ? toRecommendation(project, item) : undefined));
  return readable.flatMap(item => item ? [item] : []);
};

const toRecommendation = (project: Project, item: MarkdownRecommendation): RecommendationRecord => {
  const source = item.detail.startsWith('Filename or heading') ? 'nameHeading' : 'markdownLink';
  const recommendation = createRecommendation({ ...item, projectId: project.id, source });
  if (!recommendation) throw new Error('Invalid Markdown recommendation.');
  return recommendation;
};

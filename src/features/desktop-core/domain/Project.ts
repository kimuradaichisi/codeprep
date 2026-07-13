export type ProjectId = string;

export type Project = Readonly<{
  id: ProjectId;
  name: string;
  rootPath: string;
  excludePatterns?: readonly string[];
}>;

// evaluation/agent-context/tasks/generateTasks.ts
import { writeFileSync } from 'fs';
import { join } from 'path';
import type { TaskDefinition } from '../types';

export const EVALUATION_TASKS: readonly TaskDefinition[] = [
  {
    id: 'TASK-01',
    category: 'A',
    categoryName: 'small bug fix',
    task: 'Fix the Windows stdin hang issue in RipgrepClient by ensuring stdio ignore on stdin when spawning ripgrep.',
    primaryEntryPoint: 'src/features/repository-context/infrastructure/search/RipgrepClient.ts',
    requiredRelatedFiles: [
      'src/features/repository-context/infrastructure/search/RipgrepClient.ts',
      'src/features/repository-context/infrastructure/search/RipgrepJsonParser.ts',
    ],
    requiredTests: [
      'src/features/repository-context/infrastructure/search/__tests__/RipgrepClient.test.ts',
    ],
    validationCommands: ['npm run test:file -- src/features/repository-context/infrastructure/search/__tests__/RipgrepClient.test.ts'],
  },
  {
    id: 'TASK-02',
    category: 'B',
    categoryName: 'behavior change',
    task: 'Add token margin reserve support to ContextBudget calculations so that caller can reserve system tokens from budget.',
    primaryEntryPoint: 'src/features/repository-context/domain/ContextBudget.ts',
    requiredRelatedFiles: [
      'src/features/repository-context/domain/ContextBudget.ts',
      'src/features/token/domain/TokenBudget.ts',
    ],
    requiredTests: [
      'src/features/repository-context/domain/__tests__/ContextBudget.test.ts',
    ],
    validationCommands: ['npm run test:file -- src/features/repository-context/domain/__tests__/ContextBudget.test.ts'],
  },
  {
    id: 'TASK-03',
    category: 'C',
    categoryName: 'test update',
    task: 'Add test coverage verifying that candidate supportScore properly caps scores when category reaches maxCategoryScore.',
    primaryEntryPoint: 'src/features/repository-context/domain/CandidateEvidence.ts',
    requiredRelatedFiles: [
      'src/features/repository-context/domain/CandidateEvidence.ts',
    ],
    requiredTests: [
      'src/features/repository-context/domain/__tests__/CandidateEvidence.test.ts',
    ],
    validationCommands: ['npm run test:file -- src/features/repository-context/domain/__tests__/CandidateEvidence.test.ts'],
  },
  {
    id: 'TASK-04',
    category: 'D',
    categoryName: 'repository/config change',
    task: 'Verify the build script for the standalone MCP bundle in package.json and ensure output directory dist-mcp is created properly.',
    primaryEntryPoint: 'package.json',
    requiredRelatedFiles: [
      'package.json',
      'apps/mcp/index.ts',
    ],
    requiredTests: [
      'apps/mcp/tools/__tests__/tools.test.ts',
    ],
    validationCommands: ['npm run mcp:test'],
  },
  {
    id: 'TASK-05',
    category: 'E',
    categoryName: 'cross-layer change',
    task: 'Expose file category kind classification (code/test/doc/config) in candidate transformer and MCP types.',
    primaryEntryPoint: 'apps/mcp/tools/candidateTransformer.ts',
    requiredRelatedFiles: [
      'apps/mcp/tools/candidateTransformer.ts',
      'apps/mcp/types.ts',
      'src/features/repository-context/domain/FileKindClassifier.ts',
    ],
    requiredTests: [
      'apps/mcp/tools/__tests__/tools.test.ts',
    ],
    validationCommands: ['npm run mcp:test'],
  },
  {
    id: 'TASK-06',
    category: 'F',
    categoryName: 'documentation + code relation',
    task: 'Synchronize the token budget documentation in docs/mcp.md with the default token limit constant in buildContextPackTool.ts.',
    primaryEntryPoint: 'docs/mcp.md',
    requiredRelatedFiles: [
      'docs/mcp.md',
      'apps/mcp/tools/buildContextPackTool.ts',
    ],
    requiredTests: [
      'apps/mcp/tools/__tests__/tools.test.ts',
    ],
    validationCommands: ['npm run mcp:test'],
  },
  {
    id: 'TASK-07',
    category: 'G',
    categoryName: 'unfamiliar terminology',
    task: 'Check DocGraphClient capability audit implementation when external docgraph command is missing or unavailable.',
    primaryEntryPoint: 'src/features/repository-context/infrastructure/recommendation/DocGraphClient.ts',
    requiredRelatedFiles: [
      'src/features/repository-context/infrastructure/recommendation/DocGraphClient.ts',
      'src/features/repository-context/domain/ports.ts',
    ],
    requiredTests: [
      'src/features/repository-context/infrastructure/recommendation/__tests__/DocGraphClient.test.ts',
    ],
    validationCommands: ['npm run test:file -- src/features/repository-context/infrastructure/recommendation/__tests__/DocGraphClient.test.ts'],
  },
  {
    id: 'TASK-08',
    category: 'H',
    categoryName: 'ambiguous business-language task',
    task: 'Investigate potential double refund processing by finding the service responsible for order settlement and refund workflow.',
    primaryEntryPoint: 'src/features/repository-context/domain/TaskSearchTermExtractor.ts',
    requiredRelatedFiles: [
      'src/features/repository-context/domain/TaskSearchTermExtractor.ts',
      'src/features/repository-context/application/DiscoverFilesUseCase.ts',
    ],
    requiredTests: [
      'src/features/repository-context/domain/__tests__/TaskSearchTermExtractor.test.ts',
    ],
    validationCommands: ['npm run test:file -- src/features/repository-context/domain/__tests__/TaskSearchTermExtractor.test.ts'],
  },
  {
    id: 'TASK-09',
    category: 'B',
    categoryName: 'behavior change',
    task: 'Update workspace status checker to report degraded semantic status with ping latency in diagnostics when embedding provider is slow or offline.',
    primaryEntryPoint: 'apps/mcp/statusChecker.ts',
    requiredRelatedFiles: [
      'apps/mcp/statusChecker.ts',
      'apps/mcp/types.ts',
    ],
    requiredTests: [
      'apps/mcp/tools/__tests__/tools.test.ts',
    ],
    validationCommands: ['npm run mcp:test'],
  },
  {
    id: 'TASK-10',
    category: 'A',
    categoryName: 'small bug fix',
    task: 'Ensure relative path validation in MCP security module normalizes backslashes to forward slashes for cross-platform consistency.',
    primaryEntryPoint: 'apps/mcp/security.ts',
    requiredRelatedFiles: [
      'apps/mcp/security.ts',
    ],
    requiredTests: [
      'apps/mcp/security.test.ts',
    ],
    validationCommands: ['npm run test:file -- apps/mcp/security.test.ts'],
  },
];

const targetDir = __dirname;
EVALUATION_TASKS.forEach((t) => {
  const filePath = join(targetDir, `${t.id}.json`);
  writeFileSync(filePath, JSON.stringify(t, null, 2), 'utf-8');
  console.log(`Generated ${filePath}`);
});

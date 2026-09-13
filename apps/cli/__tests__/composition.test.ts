/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { createCliContainer } from '../composition';
import { createMcpContainer } from '../../mcp/composition';
import { PrepareTaskContextUseCase } from '../../../src/features/repository-context/application/PrepareTaskContextUseCase';

describe('CLI & MCP Shared Composition', () => {
  const ws = path.resolve(__dirname, '../../../');

  it('creates PrepareTaskContextUseCase using the shared application graph', () => {
    const cliContainer = createCliContainer(ws);
    const mcpContainer = createMcpContainer(ws);

    expect(cliContainer.prepareContextUseCase).toBeInstanceOf(PrepareTaskContextUseCase);
    expect(mcpContainer.prepareContextUseCase).toBeInstanceOf(PrepareTaskContextUseCase);

    expect(cliContainer.project.rootPath).toBe(mcpContainer.project.rootPath);
    expect(cliContainer.discoverUseCase).toBeDefined();
    expect(cliContainer.enrichUseCase).toBeDefined();
    expect(cliContainer.buildContextUseCase).toBeDefined();
  });
});

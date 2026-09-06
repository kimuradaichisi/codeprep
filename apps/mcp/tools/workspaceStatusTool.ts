// apps/mcp/tools/workspaceStatusTool.ts
import type { McpContextContainer } from '../composition';
import type { McpWorkspaceStatusResult } from '../types';
import { stderrLog, stderrError } from '../logger';

export const WORKSPACE_STATUS_TOOL_NAME = 'codeprep_workspace_status';

export const workspaceStatusToolDefinition = {
  name: WORKSPACE_STATUS_TOOL_NAME,
  description: 'Inspect current workspace binding, repository file scan status, knowledge index state, and semantic index state.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
} as const;

export async function handleWorkspaceStatus(container: McpContextContainer): Promise<McpWorkspaceStatusResult> {
  stderrLog('Executing codeprep_workspace_status');
  try {
    const status = await container.checkStatus();
    stderrLog('Workspace status evaluated successfully');
    return status;
  } catch (error) {
    stderrError('Failed to check workspace status', error);
    throw error;
  }
}

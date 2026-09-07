// apps/mcp/toolRegistry.ts
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { McpContextContainer } from './composition';
import { WORKSPACE_STATUS_TOOL_NAME, workspaceStatusToolDefinition, handleWorkspaceStatus } from './tools/workspaceStatusTool';
import { DISCOVER_ENTRY_POINTS_TOOL_NAME, discoverEntryPointsToolDefinition, handleDiscoverEntryPoints } from './tools/discoverEntryPointsTool';
import { BUILD_CONTEXT_PACK_TOOL_NAME, buildContextPackToolDefinition, handleBuildContextPack } from './tools/buildContextPackTool';
import { PREPARE_CONTEXT_TOOL_NAME, prepareContextToolDefinition, handlePrepareContext } from './tools/prepareContextTool';
import { stderrError } from './logger';

export const ALL_TOOLS = [
  workspaceStatusToolDefinition,
  discoverEntryPointsToolDefinition,
  buildContextPackToolDefinition,
  prepareContextToolDefinition,
] as const;

export function registerTools(server: Server, container: McpContextContainer): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await dispatchTool(name, args, container);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      stderrError('Tool execution error in ' + name, error);
      return { content: [{ type: 'text', text: 'Error: ' + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
  });
}

async function dispatchTool(name: string, args: unknown, container: McpContextContainer): Promise<unknown> {
  if (name === WORKSPACE_STATUS_TOOL_NAME) return handleWorkspaceStatus(container);
  if (name === DISCOVER_ENTRY_POINTS_TOOL_NAME) return handleDiscoverEntryPoints(container, args);
  if (name === BUILD_CONTEXT_PACK_TOOL_NAME) return handleBuildContextPack(container, args);
  if (name === PREPARE_CONTEXT_TOOL_NAME) return handlePrepareContext(container, args);
  throw new Error('Unknown tool: ' + name);
}


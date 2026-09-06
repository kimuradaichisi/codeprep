// apps/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpContainer } from './composition';
import { registerTools } from './toolRegistry';
import { stderrLog, stderrError } from './logger';

export const SERVER_NAME = 'codeprep-context-server';
export const SERVER_VERSION = '0.8.8';

async function startTransport(server: Server, root: string): Promise<void> {
  stderrLog('Starting MCP stdio server for workspace: ' + root);
  await server.connect(new StdioServerTransport());
  stderrLog('MCP Server connected via stdio transport');
}

export function createServer(workspaceRoot: string): { server: Server; connect: () => Promise<void> } {
  const container = createMcpContainer(workspaceRoot);
  const server = new Server({ name: SERVER_NAME, version: SERVER_VERSION }, { capabilities: { tools: {} } });
  registerTools(server, container);
  return { server, connect: () => startTransport(server, workspaceRoot) };
}

export async function runServer(workspaceRoot: string): Promise<void> {
  try {
    const { connect } = createServer(workspaceRoot);
    await connect();
  } catch (error) {
    stderrError('Fatal error starting MCP server', error);
    process.exit(1);
  }
}

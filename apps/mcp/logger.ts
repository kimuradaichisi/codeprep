// apps/mcp/logger.ts
export const stderrLog = (message: string): void => {
  process.stderr.write('[codeprep-mcp] ' + message + '\n');
};

export const stderrError = (message: string, error?: unknown): void => {
  const errStr = error instanceof Error ? ': ' + error.message : error ? ': ' + String(error) : '';
  process.stderr.write('[codeprep-mcp:error] ' + message + errStr + '\n');
};

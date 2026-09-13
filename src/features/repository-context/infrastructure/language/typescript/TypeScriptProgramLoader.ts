import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

function readConfigFile(configPath: string): ts.ParsedCommandLine {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return { options: {}, fileNames: [], errors: [] };
  }
  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
}

function resolveCompilerOptions(workspaceRoot: string): ts.ParsedCommandLine {
  const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    return readConfigFile(tsconfigPath);
  }
  return {
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
    },
    fileNames: [],
    errors: [],
  };
}

export function createTypeScriptProgram(
  workspaceRoot: string,
  targetFilePaths?: readonly string[]
): ts.Program {
  const parsed = resolveCompilerOptions(workspaceRoot);
  const rootFiles = targetFilePaths && targetFilePaths.length > 0
    ? targetFilePaths.map(p => path.isAbsolute(p) ? p : path.join(workspaceRoot, p))
    : parsed.fileNames;

  return ts.createProgram({
    rootNames: rootFiles,
    options: parsed.options,
  });
}

/*
 * Copyright 2026 CodePrep Contributors
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCliArguments } from '../argumentParser';

describe('parseCliArguments', () => {
  it('should parse --task option correctly', () => {
    const args = parseCliArguments(['--task', 'Fix checkout issue']);
    expect(args.task).toBe('Fix checkout issue');
    expect(args.format).toBe('json');
    expect(args.pack).toBe(false);
    expect(args.workspace).toBe(process.cwd());
  });

  it('should parse --workspace and alias -w', () => {
    const args1 = parseCliArguments(['--task', 'test', '--workspace', 'C:/my-project']);
    expect(args1.workspace).toBe(path.resolve('C:/my-project'));

    const args2 = parseCliArguments(['--task', 'test', '-w', 'D:/other']);
    expect(args2.workspace).toBe(path.resolve('D:/other'));

    const args3 = parseCliArguments(['--task', 'test', '--workspace=D:/other']);
    expect(args3.workspace).toBe(path.resolve('D:/other'));
  });

  it('should parse --format markdown and --pack', () => {
    const args = parseCliArguments(['--task', 'test', '--format', 'markdown', '--pack']);
    expect(args.format).toBe('markdown');
    expect(args.pack).toBe(true);
  });

  it('should parse --output and alias -o', () => {
    const args = parseCliArguments(['--task', 'test', '--output', 'out.json']);
    expect(args.output).toBe(path.resolve('out.json'));
  });

  it('should read task from --task-file', () => {
    const tmpFile = path.resolve(__dirname, 'tmp_task_test.txt');
    fs.writeFileSync(tmpFile, 'Task from file\n', 'utf-8');
    try {
      const args = parseCliArguments(['--task-file', tmpFile]);
      expect(args.task).toBe('Task from file');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('should throw when both --task and --task-file are provided', () => {
    expect(() => parseCliArguments(['--task', 't', '--task-file', 'f'])).toThrow(
      'Cannot specify both --task and --task-file'
    );
  });

  it('should throw when neither --task nor --task-file is provided', () => {
    expect(() => parseCliArguments([])).toThrow('Either --task or --task-file must be specified');
  });

  it('should throw when invalid format is provided', () => {
    expect(() => parseCliArguments(['--task', 't', '--format', 'xml'])).toThrow('Invalid format: xml');
  });

  it('should fallback to positional arguments and env variables for Windows npm resilience', () => {
    const args1 = parseCliArguments(['Fix positional issue']);
    expect(args1.task).toBe('Fix positional issue');

    const args2 = parseCliArguments(['Fix issue', 'markdown']);
    expect(args2.task).toBe('Fix issue');
    expect(args2.format).toBe('markdown');

    const env = { npm_config_pack: 'true', npm_config_workspace: 'D:/ws' };
    const args3 = parseCliArguments(['Fix issue'], env as any);
    expect(args3.pack).toBe(true);
    expect(args3.workspace).toBe(path.resolve('D:/ws'));
  });
});

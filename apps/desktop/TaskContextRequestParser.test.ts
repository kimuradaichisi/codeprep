// apps/desktop/TaskContextRequestParser.test.ts
import { describe, expect, it } from 'vitest';
import { toBuildTaskContextRequest, toDiscoverEntryPointCandidatesRequest } from './TaskContextRequestParser';

describe('toBuildTaskContextRequest', () => {
  it('parses valid request correctly', () => {
    const raw = {
      projectId: 'p1',
      task: 'Fix issue with login',
      entryPoints: ['src/auth/login.ts', 'src/auth/user.ts'],
      tokenLimit: 30000,
    };
    const parsed = toBuildTaskContextRequest(raw);
    expect(parsed.projectId).toBe('p1');
    expect(parsed.task).toBe('Fix issue with login');
    expect(parsed.entryPoints).toEqual(['src/auth/login.ts', 'src/auth/user.ts']);
    expect(parsed.tokenLimit).toBe(30000);
  });

  it('allows omitted tokenLimit', () => {
    const raw = {
      projectId: 'p1',
      task: 'Task without budget',
      entryPoints: ['src/index.ts'],
    };
    const parsed = toBuildTaskContextRequest(raw);
    expect(parsed.tokenLimit).toBeUndefined();
  });

  it('parses valid strategy correctly and throws on invalid strategy', () => {
    const raw = { projectId: 'p1', task: 'Task', entryPoints: ['src/a.ts'], strategy: 'fast' };
    expect(toBuildTaskContextRequest(raw).strategy).toBe('fast');
    const autoRaw = { projectId: 'p1', task: 'Task', entryPoints: ['src/a.ts'], strategy: 'auto' };
    expect(toBuildTaskContextRequest(autoRaw).strategy).toBe('auto');
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: 'Task', entryPoints: ['src/a.ts'], strategy: 'invalid' })).toThrow('Invalid strategy.');
  });

  it('throws on non-object', () => {
    expect(() => toBuildTaskContextRequest(null)).toThrow('Invalid task context request.');
    expect(() => toBuildTaskContextRequest('string')).toThrow('Invalid task context request.');
  });

  it('throws on missing or empty projectId', () => {
    expect(() => toBuildTaskContextRequest({ task: 'task', entryPoints: ['a'] })).toThrow('Project ID is required.');
    expect(() => toBuildTaskContextRequest({ projectId: '  ', task: 'task', entryPoints: ['a'] })).toThrow('Project ID is required.');
  });

  it('throws on missing or empty task', () => {
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: '', entryPoints: ['a'] })).toThrow('Task is required.');
  });

  it('throws on empty or invalid entryPoints', () => {
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: 'task', entryPoints: [] })).toThrow('At least one entry point is required.');
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: 'task', entryPoints: [''] })).toThrow('Entry point is required.');
  });

  it('throws on invalid tokenLimit', () => {
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: 'task', entryPoints: ['a'], tokenLimit: -1 })).toThrow('Invalid token limit.');
    expect(() => toBuildTaskContextRequest({ projectId: 'p1', task: 'task', entryPoints: ['a'], tokenLimit: 'not-number' })).toThrow('Invalid token limit.');
  });
});

describe('toDiscoverEntryPointCandidatesRequest', () => {
  it('parses valid request correctly', () => {
    const raw = {
      projectId: 'p1',
      task: 'Find refund service',
      maxCandidates: 10,
      manualPinnedPaths: ['src/Refund.ts'],
    };
    const parsed = toDiscoverEntryPointCandidatesRequest(raw);
    expect(parsed.projectId).toBe('p1');
    expect(parsed.task).toBe('Find refund service');
    expect(parsed.maxCandidates).toBe(10);
    expect(parsed.manualPinnedPaths).toEqual(['src/Refund.ts']);
  });

  it('handles optional fields', () => {
    const raw = { projectId: 'p1', task: 'Simple task' };
    const parsed = toDiscoverEntryPointCandidatesRequest(raw);
    expect(parsed.maxCandidates).toBeUndefined();
    expect(parsed.manualPinnedPaths).toBeUndefined();
  });

  it('throws on missing projectId or task', () => {
    expect(() => toDiscoverEntryPointCandidatesRequest({ task: 'abc' })).toThrow('Project ID is required.');
    expect(() => toDiscoverEntryPointCandidatesRequest({ projectId: 'p1', task: '' })).toThrow('Task is required.');
  });
});

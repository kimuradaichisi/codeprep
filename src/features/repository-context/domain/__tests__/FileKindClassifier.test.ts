import { describe, expect, it } from 'vitest';
import { classifyFileKind } from '../FileKindClassifier';

describe('classifyFileKind', () => {
  it('classifies test files correctly', () => {
    expect(classifyFileKind('src/order/OrderService.test.ts')).toBe('test');
    expect(classifyFileKind('src/order/OrderService.spec.js')).toBe('test');
    expect(classifyFileKind('src/__tests__/fixture.ts')).toBe('test');
  });

  it('classifies document files correctly', () => {
    expect(classifyFileKind('docs/architecture.md')).toBe('document');
    expect(classifyFileKind('README.mdx')).toBe('document');
  });

  it('classifies config files correctly', () => {
    expect(classifyFileKind('package.json')).toBe('config');
    expect(classifyFileKind('docker-compose.yml')).toBe('config');
    expect(classifyFileKind('config.toml')).toBe('config');
  });

  it('classifies code files correctly', () => {
    expect(classifyFileKind('src/index.ts')).toBe('code');
    expect(classifyFileKind('main.py')).toBe('code');
    expect(classifyFileKind('handler.go')).toBe('code');
  });

  it('classifies other files correctly', () => {
    expect(classifyFileKind('image.png')).toBe('other');
    expect(classifyFileKind('binary.dat')).toBe('other');
  });
});

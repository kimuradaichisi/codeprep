import { describe, expect, it } from 'vitest';
import { MarkdownSectionExtractor } from '../MarkdownSectionExtractor';

describe('MarkdownSectionExtractor', () => {
  const extractor = new MarkdownSectionExtractor();
  const projectId = 'proj-1';
  const relativePath = 'docs/guide.md';

  it('extracts H1 section correctly', () => {
    const md = '# Main Title\n\nThis is content.';
    const sections = extractor.extract(projectId, relativePath, md);

    expect(sections).toHaveLength(1);
    expect(sections[0].headingLevel).toBe(1);
    expect(sections[0].headingText).toBe('Main Title');
    expect(sections[0].headingPath).toEqual(['Main Title']);
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(3);
    expect(sections[0].content).toBe('# Main Title\n\nThis is content.');
  });

  it('handles nested and sibling headings with stack maintenance', () => {
    const md = [
      '# Refund Policy',
      '',
      'Standard refund window is 30 days.',
      '',
      '## Exceptions',
      '',
      'Custom software has no refund.',
      '',
      '## Processing',
      'Takes 3 days.',
    ].join('\n');

    const sections = extractor.extract(projectId, 'refund.md', md);
    expect(sections).toHaveLength(3);

    expect(sections[0].headingPath).toEqual(['Refund Policy']);
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(3);

    expect(sections[1].headingPath).toEqual(['Refund Policy', 'Exceptions']);
    expect(sections[1].startLine).toBe(5);
    expect(sections[1].endLine).toBe(7);

    expect(sections[2].headingPath).toEqual(['Refund Policy', 'Processing']);
    expect(sections[2].startLine).toBe(9);
    expect(sections[2].endLine).toBe(10);
  });

  it('extracts root content before first heading', () => {
    const md = 'Introductory notes.\n\n# Heading 1\nContent';
    const sections = extractor.extract(projectId, relativePath, md);

    expect(sections).toHaveLength(2);
    expect(sections[0].headingLevel).toBe(0);
    expect(sections[0].headingText).toBe('');
    expect(sections[0].headingPath).toEqual([]);
    expect(sections[0].startLine).toBe(1);
    expect(sections[0].endLine).toBe(1);
    expect(sections[0].content).toBe('Introductory notes.');
  });

  it('ignores # inside code fence blocks', () => {
    const md = [
      '# Code Example',
      '```python',
      '# this is a python comment, not markdown heading',
      'def foo(): pass',
      '```',
      'Trailing text.',
    ].join('\n');

    const sections = extractor.extract(projectId, relativePath, md);
    expect(sections).toHaveLength(1);
    expect(sections[0].headingText).toBe('Code Example');
    expect(sections[0].endLine).toBe(6);
  });

  it('handles empty sections, duplicate headings, CRLF, and Japanese', () => {
    const md = '# 概要\r\n\r\n# 同名見出し\r\n# 同名見出し\r\n';
    const sections = extractor.extract(projectId, relativePath, md);

    expect(sections).toHaveLength(3);
    expect(sections[0].headingText).toBe('概要');
    expect(sections[1].headingText).toBe('同名見出し');
    expect(sections[2].headingText).toBe('同名見出し');
    expect(sections[1].entryId).not.toBe(sections[2].entryId);
  });
});

import type { ContextFormatterPort } from '../desktop-core/application/ports';
import { OutputEngine } from '../engine/domain/OutputEngine';
import type { OutputFormat, OutputOptions } from '../engine/domain/OutputOptions';
import { SkeletonService } from '../engine/infrastructure/SkeletonService';

export class DesktopContextFormatter implements ContextFormatterPort {
  private readonly engine = new OutputEngine(new SkeletonService());

  format(input: Parameters<ContextFormatterPort['format']>[0]): string {
    return this.engine.generate(toFiles(input), toOptions(input.format)).content;
  }
}

const toFiles = (input: Parameters<ContextFormatterPort['format']>[0]) =>
  input.files.map(file => ({ path: file.relativePath, content: file.content }));

const toOptions = (format: OutputFormat): OutputOptions => ({
  format, includeMetadata: true, removeComments: false,
  includeEmptyLines: true, outputMode: 'everything',
});

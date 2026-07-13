import en from '../../package.nls.json';
import ja from '../../package.nls.ja.json';

type TranslationMap = Readonly<Record<string, string>>;

const english: TranslationMap = en;
const japanese: TranslationMap = ja;

const resolveTemplate = (key: string): string =>
  japanese[key] ?? english[key] ?? key;

const applyArguments = (template: string, args: readonly unknown[]): string =>
  args.reduce<string>((result, value, index) =>
    result.replace(new RegExp(`\\{${index}\\}`, 'g'), String(value)), template);

export const t = (key: string, ...args: readonly unknown[]): string =>
  applyArguments(resolveTemplate(key), args);

export default t;

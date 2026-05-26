let en: Record<string, string> = {};
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    en = require('../../package.nls.json');
} catch (_) { }
let ja: Record<string, string> = {};
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ja = require('../../package.nls.ja.json');
} catch (_) { }

interface VscodeL10n {
    t: (key: string, ...args: unknown[]) => string;
}
interface VscodeModuleShape {
    l10n?: VscodeL10n;
}

export function t(key: string, ...args: unknown[]): string {
    let vscodeModule: VscodeModuleShape | undefined;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        vscodeModule = require('vscode') as VscodeModuleShape;
    } catch (_) {
        vscodeModule = undefined;
    }

    // Prefer local package.nls lookups to avoid returning raw keys in test environments
    const template = (ja[key] ?? en[key]) ?? undefined;
    if (template) {
        if (!args || args.length === 0) return template;
        return args.reduce<string>((s, a, i) => s.replace(new RegExp(`\\{${i}\\}`, 'g'), String(a)), template);
    }

    const l10n = vscodeModule?.l10n;
    if (l10n && typeof l10n.t === 'function') {
        try {
            return l10n.t(key, ...args);
        } catch (_) {
            // fall through to fallback
        }
    }

    // final fallback to returning the key
    const finalTemplate = key;
    if (!args || args.length === 0) return finalTemplate;
    return args.reduce<string>((s, a, i) => s.replace(new RegExp(`\\{${i}\\}`, 'g'), String(a)), finalTemplate);
}

export default t;

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

export function t(key: string, ...args: any[]): string {
    let vscodeModule: any;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        vscodeModule = require('vscode');
    } catch (_) {
        vscodeModule = undefined;
    }

    const l10n = vscodeModule && (vscodeModule as any).l10n;
    if (l10n && typeof l10n.t === 'function') {
        try {
            return l10n.t(key, ...args);
        } catch (_) {
            // fall through to fallback
        }
    }

    const template = (ja[key] ?? en[key]) ?? key;
    if (!args || args.length === 0) return template;
    return args.reduce((s, a, i) => s.replace(new RegExp(`\\{${i}\\}`, 'g'), String(a)), template);
}

export default t;


/**
 * ディレクトリパスの配列からツリー形式の文字列を生成する
 */
export function generateTree(paths: string[]): string {
    if (paths.length === 0) return '';

    const root: any = {};

    // パスをネストされたオブジェクト構造に変換
    paths.forEach(path => {
        const parts = path.split(/[\\/]/);
        let current = root;
        parts.forEach(part => {
            if (part === '.') return;
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        });
    });

    return renderTree(root);
}

function renderTree(node: any, prefix: string = ''): string {
    const keys = Object.keys(node).sort();
    let result = '';

    keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        result += prefix + connector + key + '\n';

        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        result += renderTree(node[key], childPrefix);
    });

    return result;
}

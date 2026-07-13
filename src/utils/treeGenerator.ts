
type TreeNode = Record<string, TreeNode>;

/**
 * ディレクトリパスの配列からツリー形式の文字列を生成する
 */
export function generateTree(paths: string[]): string {
    if (paths.length === 0) return '';
    const root: TreeNode = {};
    paths.forEach(path => buildTreeObject(root, path));
    return renderTree(root);
}

function buildTreeObject(root: TreeNode, path: string): void {
    const parts = path.split(/[\\/]/);
    let current: TreeNode = root;
    parts.forEach(part => {
        if (part === '.') return;
        if (!current[part]) current[part] = {};
        current = current[part];
    });
}


function renderTree(node: TreeNode, prefix: string = ''): string {
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

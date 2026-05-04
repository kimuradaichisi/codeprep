import * as path from 'path';
import { normalizePath } from '../../../utils/path';

export class PathService {
    /**
     * 与えられたファイルパスのリストから、それらの親ディレクトリを含むすべてのパスを導出する。
     * ツリー表示において、ファイルが選択された際に親ディレクトリも「選択対象」として扱うために使用。
     */
    public static deriveAllPaths(files: string[]): string[] {
        const result = new Set<string>();
        for (const file of files) {
            const normFile = normalizePath(file);
            if (!normFile || normFile === '.' || normFile === '/') continue;

            result.add(normFile);
            let parent = path.dirname(normFile);
            while (parent !== '.' && parent !== '/' && parent !== '') {
                if (result.has(parent)) break;
                result.add(parent);
                parent = path.dirname(parent);
            }
        }
        return Array.from(result);
    }
}

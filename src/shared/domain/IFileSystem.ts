import { Result } from './Result';

export interface IFileSystem {
    readFile(path: string): Promise<Result<string>>;
    getFileSize(path: string): Promise<Result<number>>;
    readDirectory(path: string): Promise<Result<[string, boolean][]>>;

    exists(path: string): Promise<boolean>;
    writeFile(path: string, content: string): Promise<Result<void>>;
}

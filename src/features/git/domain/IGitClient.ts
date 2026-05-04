import { Result } from '../../../shared/domain/Result';

export interface IGitClient {
    getModifiedFiles(root: string): Promise<Result<string[]>>;
    getDiff(root: string, excludePaths?: string[]): Promise<Result<string>>;
    findRelatedTests(root: string, modifiedFiles: string[]): Promise<Result<string[]>>;
}

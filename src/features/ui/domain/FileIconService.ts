import { FileIconType } from './FileIconType';

export class FileIconService {
    public getIconType(isDirectory: boolean, isModified: boolean): FileIconType {
        if (isDirectory) {
            return FileIconType.Folder;
        }

        if (isModified) {
            return FileIconType.ModifiedFile;
        }

        return FileIconType.File;
    }
}

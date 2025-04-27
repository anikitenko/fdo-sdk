import writeFileAtomicImport from "write-file-atomic";

type AtomicWriteOptions = {
    mode?: number;
    encoding?: BufferEncoding;
    chown?: {
        uid: number;
        gid: number;
    };
    fsync?: boolean;
    tmpfileCreated?: (tmpfile: string) => void;
};

/**
 * Writes a file atomically using a temporary file and rename.
 * Full support for mode, encoding, chown, fsync, and tmpfile tracking.
 */
export async function atomicWriteFile(
    filePath: string,
    content: string | Buffer,
    options?: AtomicWriteOptions
): Promise<void> {
    return await writeFileAtomicImport(filePath, content, options);
}

/**
 * Writes a file atomically using a temporary file and rename.
 * Full support for mode, encoding, chown, fsync, and tmpfile tracking.
 */
export function atomicWriteFileSync(
    filePath: string,
    content: string | Buffer,
    options?: AtomicWriteOptions
): void {
    return writeFileAtomicImport.sync(filePath, content, options);
}

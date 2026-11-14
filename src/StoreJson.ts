import fs from "fs";
import path from "path";
import { StoreWithLifecycle } from "./types";
import { Logger } from "./Logger";
import { atomicWriteFile } from "./utils/atomic";

export type JsonStoreOptions = {
    filePath: string;
    logger?: Logger;
};

export type JsonStore = StoreWithLifecycle & {
    _store: Record<string, any>;
    _init: () => void;
    _save: () => void;
    _flush: () => Promise<void>;
    _fileName: string;
    _filePath: string;
    _logger: Logger;
    _writeQueue: Promise<void>;
    _writeError: unknown;
    getWriteDiagnostics: () => { pendingWrites: number; writeFailures: number; lastFailureCode?: string; disposed: boolean };
};

type Batch = { snapshot: string; revision: number };
const owners = new Map<string, JsonStore>();
let totalWriteFailures = 0;
let lastWriteFailureCode: string | undefined;

// Resolve existing ancestors too: two spellings through a symlink must not
// accidentally acquire independent writers for the same destination.
function canonicalPath(filePath: string): string {
    let current = path.resolve(filePath);
    const suffix: string[] = [];
    while (true) {
        try {
            return path.join(fs.realpathSync(current), ...suffix);
        } catch (error) {
            // ENOTDIR: an ancestor is a file. Defer to the write so the failure is reported by flush().
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
            const parent = path.dirname(current);
            if (parent === current) throw error;
            suffix.unshift(path.basename(current));
            current = parent;
        }
    }
}

export function getJsonStorageDiagnostics() {
    const stores = [...owners.values()];
    return {
        activeStores: stores.length,
        pendingWrites: stores.reduce((sum, store) => sum + store.getWriteDiagnostics().pendingWrites, 0),
        writeFailures: totalWriteFailures,
        lastFailureCode: lastWriteFailureCode,
    };
}

export function createJsonStore(options: JsonStoreOptions): JsonStore {
    const filePath = canonicalPath(options.filePath);
    if (owners.has(filePath)) {
        throw new Error("A JSON store already owns this file. Reuse it or await its dispose() before reopening.");
    }
    let pending: Batch | undefined;
    let running = false;
    let writing = false;
    let revision = 0;
    let completed = 0;
    let disposed = false;
    let disposal: Promise<void> | undefined;
    let recovery: Promise<void> = Promise.resolve();
    let failures = 0;
    let lastFailureCode: string | undefined;
    const barriers = new Set<{ revision: number; resolve: () => void; reject: (error: Error) => void }>();
    const assertActive = () => {
        if (disposed) throw new Error("JSON store is disposing or disposed; mutations are no longer allowed.");
    };
    const writeFailure = () => new Error("JSON storage write failed. Check FDO diagnostics.");
    const pump = async () => {
        // Only one write and one replaceable snapshot are retained, even when
        // callers mutate the store faster than the filesystem can persist it.
        while (pending) {
            const batch = pending;
            pending = undefined;
            writing = true;
            try {
                await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
                await atomicWriteFile(filePath, batch.snapshot, { encoding: "utf-8" });
                store._writeError = undefined;
            } catch (error) {
                store._writeError = error ?? writeFailure();
                failures++;
                totalWriteFailures++;
                lastFailureCode = (error as NodeJS.ErrnoException)?.code;
                lastWriteFailureCode = lastFailureCode;
                store._logger.warn(`[StoreJson] Failed to save ${store._fileName}:`, error);
            }
            writing = false;
            completed = batch.revision;
            // Settle barriers now, before a later write can change the error.
            for (const barrier of barriers) {
                if (barrier.revision <= completed) {
                    barriers.delete(barrier);
                    if (store._writeError !== undefined) barrier.reject(writeFailure());
                    else barrier.resolve();
                }
            }
        }
        running = false;
    };
    const logger = options.logger ?? new Logger();
    const store: JsonStore = {
        _store: {},
        _fileName: path.basename(filePath),
        _filePath: filePath,
        _logger: logger,
        _writeQueue: Promise.resolve(),
        _writeError: undefined,
        capabilities: {
            persistent: true,
            supportsAsyncFlush: true,
            supportsVersioning: false,
            supportsMigrations: false,
            supportsEncryption: false,
            supportsCompression: false,
        },

        _init() {
            assertActive();
            if (fs.existsSync(this._filePath)) {
                try {
                    const raw = fs.readFileSync(this._filePath, "utf-8");
                    try {
                        this._store = JSON.parse(raw);
                    } catch (error) {
                        const backupPath = `${this._filePath}.corrupt-${Date.now()}.json`;
                        // Recovery strategy: keep a copy of corrupted data for diagnostics, reset in-memory store.
                        recovery = fs.promises.mkdir(path.dirname(this._filePath), { recursive: true })
                            .then(() => fs.promises.writeFile(backupPath, raw, "utf-8"))
                            .then(() => {
                                this._logger.warn(
                                    `[StoreJson] Corrupted JSON detected in ${this._fileName}. Backup written to ${path.basename(backupPath)}.`,
                                    error
                                );
                            })
                            .catch((recoveryError) => {
                                this._logger.warn(`[StoreJson] Failed to persist corrupted backup for ${this._fileName}:`, recoveryError);
                            });
                        this._store = {};
                        this._logger.warn(`[StoreJson] Failed to read or parse ${this._fileName}:`, error);
                    }
                } catch (error) {
                    this._store = {};
                    this._logger.warn(`[StoreJson] Failed to read or parse ${this._fileName}:`, error);
                }
            }
        },

        _save() {
            assertActive();
            // Serialization is synchronous so mutation of a caller-owned object
            // after set() cannot silently change the queued snapshot.
            const snapshot = JSON.stringify(this._store, null, 2);
            pending = { snapshot, revision: ++revision };
            if (!running) {
                running = true;
                this._writeQueue = Promise.resolve().then(pump);
            }
        },

        _flush() {
            const target = revision;
            if (completed >= target) {
                return this._writeError === undefined ? Promise.resolve() : Promise.reject(writeFailure());
            }
            return new Promise<void>((resolve, reject) => barriers.add({ revision: target, resolve, reject }));
        },
        flush() {
            return this._flush();
        },
        beginShutdown() {
            disposed = true;
        },
        dispose() {
            if (disposal) return disposal;
            disposed = true;
            disposal = this._flush().finally(async () => {
                await recovery;
                owners.delete(filePath);
                if (!options.logger) logger.close();
            });
            return disposal;
        },
        getWriteDiagnostics() {
            return { pendingWrites: Number(writing) + Number(Boolean(pending)), writeFailures: failures, lastFailureCode, disposed };
        },

        get(key) {
            return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : undefined;
        },
        set(key, value) {
            assertActive();
            this._store[key] = value;
            this._save();
        },
        remove(key) {
            assertActive();
            delete this._store[key];
            this._save();
        },
        clear() {
            assertActive();
            this._store = {};
            this._save();
        },
        has(key) {
            return key in this._store;
        },
        keys() {
            return Object.keys(this._store);
        },
    };

    try {
        store._init();
        owners.set(filePath, store);
        return store;
    } catch (error) {
        if (!options.logger) logger.close();
        throw error;
    }
}

// Legacy singleton export retained for direct imports.
export const StoreJson: JsonStore = createJsonStore({
    filePath: path.resolve(process.cwd(), ".store.json"),
});

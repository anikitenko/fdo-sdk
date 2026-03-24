import fs from "fs";
import path from "path";
import { StoreType, StoreWithLifecycle } from "./types";
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
};

export function createJsonStore(options: JsonStoreOptions): JsonStore {
    const logger = options.logger ?? new Logger();
    const store: JsonStore = {
        _store: {},
        _fileName: path.basename(options.filePath),
        _filePath: options.filePath,
        _logger: logger,
        _writeQueue: Promise.resolve(),
        capabilities: {
            persistent: true,
            supportsAsyncFlush: true,
            supportsVersioning: false,
            supportsMigrations: false,
            supportsEncryption: false,
            supportsCompression: false,
        },

        _init() {
            if (fs.existsSync(this._filePath)) {
                try {
                    const raw = fs.readFileSync(this._filePath, "utf-8");
                    try {
                        this._store = JSON.parse(raw);
                    } catch (error) {
                        const backupPath = `${this._filePath}.corrupt-${Date.now()}.json`;
                        // Recovery strategy: keep a copy of corrupted data for diagnostics, reset in-memory store.
                        void fs.promises.mkdir(path.dirname(this._filePath), { recursive: true })
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
            const snapshot = JSON.stringify(this._store, null, 2);
            this._writeQueue = this._writeQueue
                .then(async () => {
                    await fs.promises.mkdir(path.dirname(this._filePath), { recursive: true });
                    await atomicWriteFile(this._filePath, snapshot, { encoding: "utf-8" });
                })
                .catch((error) => {
                    this._logger.warn(`[StoreJson] Failed to save ${this._fileName}:`, error);
                });
        },

        _flush() {
            return this._writeQueue;
        },
        flush() {
            return this._flush();
        },
        dispose() {
            return this._flush();
        },

        get(key) {
            return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : undefined;
        },
        set(key, value) {
            this._store[key] = value;
            this._save();
        },
        remove(key) {
            delete this._store[key];
            this._save();
        },
        clear() {
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

    store._init();
    return store;
}

// Legacy singleton export retained for direct imports.
export const StoreJson: JsonStore = createJsonStore({
    filePath: path.resolve(process.cwd(), ".store.json"),
});

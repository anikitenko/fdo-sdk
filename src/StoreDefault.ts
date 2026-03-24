import { StoreType, StoreWithLifecycle } from "./types";

export type MemoryStore = StoreWithLifecycle & { memory: Record<string, any> };

export function createDefaultStore(initialState: Record<string, any> = {}): MemoryStore {
    return {
        memory: { ...initialState },
        capabilities: {
            persistent: false,
            supportsAsyncFlush: false,
            supportsVersioning: false,
            supportsMigrations: false,
            supportsEncryption: false,
            supportsCompression: false,
        },
        get(key) {
            return Object.prototype.hasOwnProperty.call(this.memory, key) ? this.memory[key] : undefined;
        },
        set(key, value) {
            this.memory[key] = value;
        },
        remove(key) {
            delete this.memory[key];
        },
        clear() {
            for (const key in this.memory) {
                delete this.memory[key];
            }
        },
        has(key) {
            return key in this.memory;
        },
        keys() {
            return Object.keys(this.memory);
        },
        flush() {
            return Promise.resolve();
        },
        dispose() {
            this.clear();
        },
    };
}

// Legacy singleton export retained for direct imports.
export const StoreDefault: MemoryStore = createDefaultStore();

import fs from "fs"
import path from "path"
import {StoreType} from "./types";
import {Logger} from "./Logger";

export const StoreJson: StoreType & { 
    _store?: Record<string, any>,
    _init?: () => void,
    _save?: () => void,
    _fileName?: string,
    _filePath?: string,
    _logger?: any
} = (() => {
    const store: StoreType & { 
        _store?: Record<string, any>,
        _init?: () => void,
        _save?: () => void,
        _fileName?: string,
        _filePath?: string,
        _logger?: any
    } = {
        _store: {},
        _fileName: ".store.json",
        _filePath: path.resolve(process.cwd(), ".store.json"),
        _logger: new Logger(),

        // Initialize the store
        _init() {
            if (fs.existsSync(this._filePath!)) {
                try {
                    const raw = fs.readFileSync(this._filePath!, "utf-8")
                    this._store = JSON.parse(raw)
                } catch (e) {
                    this._logger.warn(`[StoreJson] Failed to read or parse ${this._fileName}:`, e)
                }
            }
        },

        // Persist changes to file
        _save() {
            try {
                fs.writeFileSync(this._filePath!, JSON.stringify(this._store, null, 2), "utf-8")
            } catch (e) {
                this._logger.warn(`[StoreJson] Failed to save ${this._fileName}:`, e)
            }
        },

        get(key) {
            return Object.prototype.hasOwnProperty.call(this._store!, key) ? this._store![key] : undefined
        },
        set(key, value) {
            this._store![key] = value
            this._save?.()
        },
        remove(key) {
            delete this._store![key]
            this._save?.()
        },
        clear() {
            this._store = {}
            this._save?.()
        },
        has(key) {
            return key in this._store!
        },
        keys() {
            return Object.keys(this._store!)
        }
    }

    // Initialize on module load
    store._init!()

    return store
})()

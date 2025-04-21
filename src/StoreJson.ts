import fs from "fs"
import path from "path"
import {StoreType} from "./types";
import {Logger} from "./Logger";

export const StoreJson: StoreType = (() => {
    const fileName = ".store.json"
    const filePath = path.resolve(process.cwd(), fileName)
    let store: Record<string, any> = {}

    const logger = new Logger()

    // Load existing data on init
    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, "utf-8")
            store = JSON.parse(raw)
        } catch (e) {
            logger.warn(`[StoreJson] Failed to read or parse ${fileName}:`, e)
        }
    }

    // Persist changes to file
    function save() {
        try {
            fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8")
        } catch (e) {
            logger.warn(`[StoreJson] Failed to save ${fileName}:`, e)
        }
    }

    return {
        get(key) {
            return store.hasOwnProperty(key) ? store[key] : undefined
        },
        set(key, value) {
            store[key] = value
            save()
        },
        remove(key) {
            delete store[key]
            save()
        },
        clear() {
            store = {}
            save()
        },
        has(key) {
            return key in store
        },
        keys() {
            return Object.keys(store)
        }
    }
})()

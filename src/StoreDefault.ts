import {StoreType} from "./types";

export const StoreDefault: StoreType = (() => {
    const memory: Record<string, any> = {}

    return {
        get(key) {
            return memory.hasOwnProperty(key) ? memory[key] : undefined
        },
        set(key, value) {
            memory[key] = value
        },
        remove(key) {
            delete memory[key]
        },
        clear() {
            for (const key in memory) {
                delete memory[key]
            }
        },
        has(key) {
            return key in memory
        },
        keys() {
            return Object.keys(memory)
        }
    }
})()
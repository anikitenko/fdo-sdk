import {StoreType} from "./types";

export const StoreDefault: StoreType & { memory?: Record<string, any> } = (() => {
    const store: StoreType & { memory?: Record<string, any> } = {
        memory: {},
        get(key) {
            return Object.prototype.hasOwnProperty.call(this.memory!, key) ? this.memory![key] : undefined
        },
        set(key, value) {
            this.memory![key] = value
        },
        remove(key) {
            delete this.memory![key]
        },
        clear() {
            for (const key in this.memory) {
                delete this.memory[key]
            }
        },
        has(key) {
            return key in this.memory!
        },
        keys() {
            return Object.keys(this.memory!)
        }
    }

    return store
})()

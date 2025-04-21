import pifyImport from "pify";

/**
 * Promisify a function
 * @param fn
 */
export function pify<T extends (...args: any[]) => any>(fn: T) {
    return pifyImport(fn);
}

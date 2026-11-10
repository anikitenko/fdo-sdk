import type {PluginHandler} from '../types';
import type {SharedLogic, SharedLogicDefinition, SharedLogicHandler, SharedLogicMethodContract, SharedLogicRegistration} from '../SharedLogic';

export type SharedFunctionOptions = {
    /** Service name, namespaced by the host under the installed provider ID. */
    service: string;
    version: number;
    description: string;
    /** Exported method name; defaults to the decorated method's name. */
    method?: string;
    contract?: SharedLogicMethodContract;
};

type MethodRegistration = {handler?: string; shared?: SharedFunctionOptions & {method: string}};
const metadata = new WeakMap<object, Map<string | symbol, MethodRegistration>>();
const applied = new WeakSet<object>();
const unsafeNames = new Set(['constructor', 'prototype', '__proto__', 'then']);

function remember(target: object, key: string | symbol, descriptor: PropertyDescriptor, value: MethodRegistration): void {
    if (typeof target === 'function' || typeof descriptor?.value !== 'function') {
        throw new Error('Registration decorators support instance methods only.');
    }
    let methods = metadata.get(target);
    if (!methods) { methods = new Map(); metadata.set(target, methods); }
    const previous = methods.get(key) ?? {};
    if ((value.handler !== undefined && previous.handler !== undefined) || (value.shared && previous.shared)) {
        throw new Error(`Duplicate registration decorator on method '${String(key)}'.`);
    }
    methods.set(key, {...previous, ...value});
}

/** Register an instance method as a UI handler before init(), once per plugin instance. */
export function handler(name?: string): MethodDecorator {
    return (target, key, descriptor) => {
        const publicName = name ?? (typeof key === 'string' ? key : undefined);
        if (!publicName || !/^[A-Za-z_][A-Za-z0-9._-]{0,127}$/.test(publicName)
            || unsafeNames.has(publicName) || /^__(sdk|host)\./.test(publicName)) {
            throw new Error('A handler needs a non-reserved string name; supply an explicit name for symbol methods.');
        }
        remember(target, key, descriptor, {handler: publicName});
    };
}

/** Export a method through SharedLogic.register; this never grants a capability. */
export function sharedFunction(options: SharedFunctionOptions): MethodDecorator {
    return (target, key, descriptor) => {
        const method = options.method ?? (typeof key === 'string' ? key : undefined);
        if (!method || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(method) || unsafeNames.has(method)) {
            throw new Error('A shared function needs a non-reserved exported method name.');
        }
        remember(target, key, descriptor, {shared: {...options, method}});
    };
}

/** Internal lifecycle hook. Metadata is prototype-local; bindings are instance-local. */
export function applyDecoratedRegistrations(
    plugin: {shared: Pick<SharedLogic, 'register'>},
    registerHandler: (name: string, method: PluginHandler) => void
): void {
    if (applied.has(plugin)) return;
    const chain: object[] = [];
    for (let prototype = Object.getPrototypeOf(plugin); prototype; prototype = Object.getPrototypeOf(prototype)) chain.unshift(prototype);
    const methods = new Map<string | symbol, MethodRegistration>();
    for (const prototype of chain) {
        for (const [key, value] of metadata.get(prototype) ?? []) methods.set(key, {...methods.get(key), ...value});
    }
    const handlers = new Map<string, PluginHandler>();
    const services = new Map<string, {definition: SharedLogicDefinition; methods: Record<string, SharedLogicHandler>}>();
    for (const [key, registration] of methods) {
        const method = Reflect.get(plugin, key);
        if (typeof method !== 'function') throw new Error(`Decorated method '${String(key)}' is no longer callable.`);
        // Resolve the final method descriptor, including any handleError wrapper.
        const bound = method.bind(plugin);
        if (registration.handler !== undefined) {
            if (handlers.has(registration.handler)) throw new Error(`Duplicate decorated handler '${registration.handler}'.`);
            handlers.set(registration.handler, bound);
        }
        if (registration.shared) {
            const {service, version, description, method: name, contract} = registration.shared;
            const id = `${service}.v${version}`;
            let group = services.get(id);
            if (!group) {
                group = {definition: {name: service, version, description}, methods: Object.create(null)};
                services.set(id, group);
            }
            if (group.definition.description !== description) throw new Error(`Conflicting descriptions for decorated service '${id}'.`);
            if (Object.prototype.hasOwnProperty.call(group.methods, name)) throw new Error(`Duplicate decorated shared method '${id}.${name}'.`);
            group.methods[name] = bound;
            if (contract) (group.definition.contract ??= {})[name] = contract;
        }
    }
    const registrations: SharedLogicRegistration[] = [];
    try {
        for (const {definition, methods} of services.values()) registrations.push(plugin.shared.register(definition, methods));
        for (const [name, method] of handlers) registerHandler(name, method);
        applied.add(plugin);
    } catch (error) {
        for (const registration of registrations) void registration.dispose().catch(() => {});
        throw error;
    }
}

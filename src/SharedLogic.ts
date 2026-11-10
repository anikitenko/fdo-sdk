import {randomUUID} from 'crypto';
import {requireCapability} from './utils/capabilities';
import {PluginScope} from './PluginScope';

export type SharedLogicCapability = `plugins.shared.call.${string}.${string}.v${number}`;
export type SharedLogicTarget = {providerId: string; name: string; version: number};
export type SharedLogicDefinition = {name: string; version: number; description: string};
export type SharedLogicService = SharedLogicTarget & {description: string; methods: string[]; capability: SharedLogicCapability};
export type SharedLogicContext = {callerId: string; signal: AbortSignal};
export type SharedLogicHandler = (input: any, context: SharedLogicContext) => unknown | Promise<unknown>;
export type SharedLogicOptions = {signal?: AbortSignal; timeoutMs?: number};
export type SharedLogicErrorCode = 'ACCESS_DENIED' | 'UNAVAILABLE' | 'INVALID_REQUEST' | 'TIMEOUT' | 'CANCELLED' | 'BACKPRESSURE' | 'NOT_FOUND' | 'CONFLICT' | 'SERVICE_ERROR';
export class SharedLogicError extends Error {
    constructor(public readonly code: SharedLogicErrorCode) { super(`Shared logic request failed (${code}).`); this.name = 'SharedLogicError'; }
}
export type SharedLogicRequest =
    | {op: 'list'}
    | {op: 'register'; definition: SharedLogicDefinition; methods: string[]}
    | {op: 'unregister'; registrationId: string}
    | {op: 'call'; callId: string; target: SharedLogicTarget; method: string; input: unknown; timeoutMs: number}
    | {op: 'cancel'; callId: string};
export type SharedLogicConfiguration = {request: (request: SharedLogicRequest) => Promise<unknown>};
export type SharedLogicInvocation = SharedLogicTarget & {registrationId: string; callId: string; method: string; input: unknown; callerId: string};
export type SharedLogicReply = {result?: unknown; error?: SharedLogicErrorCode};
export type SharedLogicRegistration = {ready: Promise<void>; dispose: () => Promise<void>};

const targetPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/;
const namePattern = /^[a-z][a-z0-9-]{0,63}$/;
const methodPattern = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const blockedNames = new Set(['constructor', 'prototype', '__proto__', 'then']);
const errorCodes: SharedLogicErrorCode[] = ['ACCESS_DENIED','UNAVAILABLE','INVALID_REQUEST','TIMEOUT','CANCELLED','BACKPRESSURE','NOT_FOUND','CONFLICT','SERVICE_ERROR'];
let configuration: Readonly<SharedLogicConfiguration> | undefined;
let configurationController = new AbortController();
const registrations = new Map<string, LocalRegistration>();
const invocations = new Map<string, {registrationId: string; controller: AbortController}>();
type LocalRegistration = {definition: SharedLogicDefinition; methods: Record<string, SharedLogicHandler>; registrationId?: string; ready: Promise<void>; closed: boolean; scope: PluginScope};
const key = (target: {name: string; version: number}) => `${target.name}.v${target.version}`;
const invalid = (): never => {throw new SharedLogicError('INVALID_REQUEST');};

export function sharedLogicCapability(target: SharedLogicTarget): SharedLogicCapability {
    validateTarget(target);
    return `plugins.shared.call.${target.providerId}.${target.name}.v${target.version}`;
}
export function isSharedLogicCapability(value: string): value is SharedLogicCapability {
    return /^plugins\.shared\.call\.[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}\.[a-z][a-z0-9-]{0,63}\.v[1-9][0-9]{0,3}$/.test(value);
}
function validateTarget(target: SharedLogicTarget): void {
    if (!target || typeof target.providerId !== "string" || typeof target.name !== "string" || !targetPattern.test(target.providerId) || !namePattern.test(target.name)
        || !Number.isSafeInteger(target.version) || target.version < 1 || target.version > 9999) invalid();
}
/** The wire contract is finite JSON, capped at 256 KiB in each direction. */
export function cloneSharedLogicValue(value: unknown): unknown {
    const seen = new Set<object>();
    let nodes = 0;
    let bytes = 0;
    const visit = (current: unknown, depth: number): void => {
        if (depth > 32 || ++nodes > 16384) return invalid();
        if (typeof current === 'string') {
            bytes += Buffer.byteLength(current, 'utf8');
            if (bytes > 262144) return invalid();
            return;
        }
        if (current === null || typeof current === 'boolean') return;
        if (typeof current === 'number' && Number.isFinite(current)) return;
        if (typeof current !== 'object' || !current || seen.has(current)) return invalid();
        if (!Array.isArray(current) && Object.getPrototypeOf(current) !== Object.prototype && Object.getPrototypeOf(current) !== null) invalid();
        if (Array.isArray(current) && current.length > 16384) return invalid();
        seen.add(current);
        for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(current))) {
            if (Array.isArray(current) && name === 'length') continue;
            bytes += Buffer.byteLength(name, 'utf8');
            if (bytes > 262144) return invalid();
            if (!descriptor.enumerable || !('value' in descriptor) || ['constructor','prototype','__proto__'].includes(name)) invalid();
            visit(descriptor.value, depth + 1);
        }
        seen.delete(current);
    };
    visit(value, 0);
    const json = JSON.stringify(value);
    if (Buffer.byteLength(json, 'utf8') > 262144) invalid();
    return JSON.parse(json);
}
function safeError(error: unknown): SharedLogicError {
    const code = (error as {code?: SharedLogicErrorCode})?.code;
    return new SharedLogicError(code && errorCodes.includes(code) ? code : 'UNAVAILABLE');
}
function transport(): Readonly<SharedLogicConfiguration> {
    if (typeof window !== 'undefined' || !configuration) throw new SharedLogicError('UNAVAILABLE');
    return configuration;
}
/** Host bootstrap only: this adapter must be bound to the worker's authenticated identity. */
export function configureSharedLogic(value: SharedLogicConfiguration | null): void {
    if (value && typeof value.request !== 'function') invalid();
    configurationController.abort();
    configurationController = new AbortController();
    if (configuration) {
        for (const entry of registrations.values()) entry.closed = true;
        registrations.clear();
        for (const entry of invocations.values()) entry.controller.abort();
    }
    configuration = value ? Object.freeze({request: value.request.bind(value)}) : undefined;
}
export function cancelSharedLogicInvocation(callId: string): void { invocations.get(callId)?.controller.abort(); }
export async function dispatchSharedLogic(invocation: SharedLogicInvocation): Promise<SharedLogicReply> {
    try {
        requireCapability('plugins.shared.provide', 'provide shared plugin logic');
        validateTarget(invocation);
        if (typeof invocation.callId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(invocation.callId)
            || typeof invocation.callerId !== 'string' || !targetPattern.test(invocation.callerId)) invalid();
        const entry = registrations.get(key(invocation));
        if (!entry || entry.closed || !Object.prototype.hasOwnProperty.call(entry.methods, invocation.method)) return {error: 'NOT_FOUND'};
        if (invocations.has(invocation.callId) || invocations.size >= 32) return {error: 'BACKPRESSURE'};
        const controller = new AbortController();
        invocations.set(invocation.callId, {registrationId: invocation.registrationId, controller});
        const abort = () => controller.abort();
        entry.scope.signal.addEventListener('abort', abort, {once: true});
        try {
            await entry.ready;
            if (controller.signal.aborted || entry.scope.signal.aborted) return {error: 'CANCELLED'};
            if (entry.closed || entry.registrationId !== invocation.registrationId) return {error: 'UNAVAILABLE'};
            const input = cloneSharedLogicValue(invocation.input);
            const output = await entry.methods[invocation.method](input, Object.freeze({callerId: invocation.callerId, signal: controller.signal}));
            if (controller.signal.aborted || entry.closed) return {error: 'CANCELLED'};
            return {result: cloneSharedLogicValue(output)};
        } catch { return {error: controller.signal.aborted ? 'CANCELLED' : 'SERVICE_ERROR'}; }
        finally { entry.scope.signal.removeEventListener('abort', abort); invocations.delete(invocation.callId); }
    } catch (error) { return {error: safeError(error).code}; }
}

export class SharedLogic {
    private pendingCalls = 0;
    constructor(private readonly scope: PluginScope, private readonly onError: (error: Error) => void = () => {}) {}

    public register(definition: SharedLogicDefinition, methods: Record<string, SharedLogicHandler>): SharedLogicRegistration {
        requireCapability('plugins.shared.provide', 'provide shared plugin logic');
        definition = {...definition};
        const adapter = transport();
        validateTarget({...definition, providerId: 'local'});
        if (typeof definition.description !== 'string' || !definition.description.trim() || definition.description.length > 1000
            || !methods || typeof methods !== 'object' || Array.isArray(methods)) invalid();
        const names = Object.keys(methods);
        if (!names.length || names.length > 32 || names.some(name => !methodPattern.test(name) || blockedNames.has(name) || typeof methods[name] !== 'function')) invalid();
        if (this.scope.signal.aborted) throw new SharedLogicError('CANCELLED');
        if (registrations.has(key(definition))) throw new SharedLogicError('CONFLICT');
        if (registrations.size >= 16) throw new SharedLogicError('BACKPRESSURE');
        const entry: LocalRegistration = {definition: {...definition}, methods: {...methods}, ready: Promise.resolve(), closed: false, scope: this.scope};
        registrations.set(key(definition), entry);
        entry.ready = Promise.resolve().then(() => adapter.request({op: 'register', definition: {...definition}, methods: names})).then(reply => {
            if (!reply || typeof (reply as any).registrationId !== 'string') throw new SharedLogicError('UNAVAILABLE');
            entry.registrationId = (reply as any).registrationId;
        }).catch(error => { if (registrations.get(key(definition)) === entry) registrations.delete(key(definition)); throw safeError(error); });
        // Registration is usable from synchronous init(); ignoring ready cannot
        // produce an unhandled rejection, while awaiting it still reports failure.
        void entry.ready.catch(error => {try { this.onError(error); } catch {}});
        let disposal: Promise<void> | undefined;
        let unregister = () => {};
        const dispose = () => {
            if (disposal) return disposal;
            entry.closed = true;
            if (registrations.get(key(definition)) === entry) registrations.delete(key(definition));
            for (const active of invocations.values()) if (active.registrationId === entry.registrationId) active.controller.abort();
            unregister();
            disposal = entry.ready.catch(() => {}).then(async () => {
                if (entry.registrationId && configuration === adapter) {
                    try { await adapter.request({op: 'unregister', registrationId: entry.registrationId}); } catch {}
                }
            });
            return disposal;
        };
        unregister = this.scope.add(dispose);
        return {ready: entry.ready, dispose};
    }

    public async list(): Promise<SharedLogicService[]> {
        requireCapability('plugins.shared.use', 'discover shared plugin logic');
        const adapter = transport();
        let result;
        try { result = await adapter.request({op: 'list'}); } catch (error) { throw safeError(error); }
        if (configuration !== adapter) throw new SharedLogicError('UNAVAILABLE');
        if (!Array.isArray(result)) return invalid();
        return result.map(value => {
            validateTarget(value);
            if (typeof value.description !== 'string' || value.description.length > 1000 || !Array.isArray(value.methods) || value.methods.length > 32
                || value.methods.some((name: unknown) => typeof name !== 'string' || !methodPattern.test(name) || blockedNames.has(name))) invalid();
            return {providerId: value.providerId, name: value.name, version: value.version, description: value.description,
                methods: [...value.methods], capability: sharedLogicCapability(value)};
        });
    }

    public async call<TOutput = unknown>(target: SharedLogicTarget, method: string, input: unknown, options: SharedLogicOptions = {}): Promise<TOutput> {
        requireCapability('plugins.shared.use', 'use shared plugin logic');
        sharedLogicCapability(target);
        target = {providerId: target.providerId, name: target.name, version: target.version};
        options = {...options};
        requireCapability(sharedLogicCapability(target), 'call this shared plugin service');
        if (typeof method !== 'string' || !methodPattern.test(method) || blockedNames.has(method)) invalid();
        const timeoutMs = options.timeoutMs ?? 10000;
        if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) invalid();
        if (this.pendingCalls >= 16) throw new SharedLogicError('BACKPRESSURE');
        const payload = cloneSharedLogicValue(input);
        const adapter = transport();
        const callId = randomUUID();
        if (this.scope.signal.aborted || options.signal?.aborted) throw new SharedLogicError('CANCELLED');
        this.pendingCalls++;
        const adapterSignal = configurationController.signal;
        let cancel!: () => void;
        let sent = false;
        let stopped = false;
        let stop!: (code: 'CANCELLED' | 'TIMEOUT') => void;
        const cancelled = new Promise<never>((_resolve, reject) => {
            stop = code => {
                if (stopped) return;
                stopped = true;
                reject(new SharedLogicError(code));
                if (sent) void Promise.resolve().then(() => adapter.request({op: 'cancel', callId})).catch(() => {});
            };
            cancel = () => stop('CANCELLED');
        });
        const timer = setTimeout(() => stop('TIMEOUT'), timeoutMs);
        adapterSignal.addEventListener('abort', cancel, {once: true});
        this.scope.signal.addEventListener('abort', cancel, {once: true});
        options.signal?.addEventListener('abort', cancel, {once: true});
        try {
            const request = Promise.resolve().then(() => {
                if (stopped || adapterSignal.aborted || this.scope.signal.aborted || options.signal?.aborted) {
                    throw new SharedLogicError('CANCELLED');
                }
                sent = true;
                return adapter.request({op: 'call', callId, target: {...target}, method, input: payload, timeoutMs});
            });
            let result;
            try { result = await Promise.race([request, cancelled]); } catch (error) { throw safeError(error); }
            if (configuration !== adapter) throw new SharedLogicError('UNAVAILABLE');
            requireCapability('plugins.shared.use', 'use shared plugin logic');
            requireCapability(sharedLogicCapability(target), 'call this shared plugin service');
            return cloneSharedLogicValue(result) as TOutput;
        } finally {
            this.pendingCalls--;
            clearTimeout(timer);
            adapterSignal.removeEventListener('abort', cancel);
            this.scope.signal.removeEventListener('abort', cancel);
            options.signal?.removeEventListener('abort', cancel);
        }
    }

    public client<T extends Record<string, (input: any) => any>>(target: SharedLogicTarget) {
        sharedLogicCapability(target);
        target = {providerId: target.providerId, name: target.name, version: target.version};
        return {call: <K extends keyof T & string>(method: K, input: Parameters<T[K]>[0], options?: SharedLogicOptions): Promise<Awaited<ReturnType<T[K]>>> => this.call(target, method, input, options)};
    }
}

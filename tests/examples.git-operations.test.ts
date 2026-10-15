import { beforeAll, beforeEach, afterEach, describe, expect, test, vi } from 'vitest';
import { PluginRegistry } from '../src';
let GitOperationsPlugin: typeof import('../examples/12-git-operations-plugin').default;
const call = (handler: string, payload: unknown = {}) => PluginRegistry.callHandler(handler.startsWith('gitOps.') || handler.startsWith('fdo.') ? handler : `gitOps.v1.${handler}`, payload);
beforeAll(async () => {
    (process as any).parentPort = { on: vi.fn(), postMessage: vi.fn() };
    GitOperationsPlugin = (await import('../examples/12-git-operations-plugin')).default;
});
beforeEach(() => {
    PluginRegistry.clearAllHandlers(); PluginRegistry.clearPlugin(); PluginRegistry.configureStorage({ rootDir: undefined }); PluginRegistry.configureCapabilities({ granted: [] });
    for (const name of ['__FDO_AI_REQUEST', '__FDO_AI_ASSISTANT', '__FDO_AI_LIST_ASSISTANTS', '__FDO_AI_ASSISTANTS']) delete (globalThis as any)[name];
    vi.stubGlobal('require', (name: string) => {
        if (name !== 'fs') throw Error(`Unexpected module: ${name}`);
        return { existsSync: (value: string) => !value.includes('missing'), statSync: (value: string) => ({ isDirectory: () => !value.endsWith('.txt') }), accessSync: () => {}, constants: { X_OK: 1 } };
    });
    new GitOperationsPlugin();
});
afterEach(() => vi.unstubAllGlobals());
describe('Git operations example handlers', () => {
    test('prepares a session fallback and registers quick/side-panel intents without executing commands', async () => {
        const prepared = await call('prepare') as any;
        expect(prepared).toMatchObject({ ok: true, storageMode: 'session-fallback', jsonStoreAvailable: false }); expect(prepared.operations.length).toBeGreaterThan(5);
        for (const handler of ['quick.status', 'quick.snapshot', 'quick.prefetch', 'sidePanel.console', 'sidePanel.recent', 'sidePanel.profiles']) expect(await call(handler)).toMatchObject({ ok: true });
    });
    test('validates paths and persists the original configured repository', async () => {
        expect(await call('saveRepoPath')).toMatchObject({ ok: false, code: 'INVALID_REPO_PATH' });
        for (const cwd of ['relative', '/missing', '/file.txt']) expect(await call('saveRepoPath', { cwd })).toMatchObject({ ok: false, code: 'SAVE_REPO_PATH_FAILED' });
        expect(await call('saveRepoPath', { cwd: '/fixture/repository' })).toMatchObject({ ok: true, persistence: 'session-fallback' });
        const prepared = await call('prepare') as any; expect(prepared.originalConfiguredRepoPath).toBe('/fixture/repository');
    });
    test.each(['status', 'branches', 'log', 'diffStat', 'showHead', 'fetch', 'pullFFOnly'])('builds a validated %s request without executing Git', async operation => {
        const response = await call('buildRequest', { operation, cwd: '/fixture/repository', dryRun: true }) as any;
        expect(response.request.action).toBe('system.process.exec'); expect(response.request.payload).toMatchObject({ scope: 'git', cwd: '/fixture/repository', dryRun: true });
        expect(response.request.payload.args.length).toBeGreaterThan(0); expect(response.correlationId).toContain('git-');
    });
    test('rejects unknown operations and missing commit messages; preserves explicit commit arguments', async () => {
        expect(await call('buildRequest', { operation: 'erase-everything' })).toMatchObject({ ok: false, code: 'INVALID_OPERATION' });
        expect(await call('buildCommitRequest', { cwd: '/fixture/repository', message: '' })).toMatchObject({ ok: false, code: 'COMMIT_MESSAGE_REQUIRED' });
        for (const dryRun of [true, false]) {
            const response = await call('buildCommitRequest', { cwd: '/fixture/repository', message: ' fix: preserve text ', dryRun }) as any;
            expect(response.request.payload.args).toEqual(dryRun ? ['commit', '--dry-run', '-m', 'fix: preserve text'] : ['commit', '-m', 'fix: preserve text']);
        }
    });
    test('prefetch builds a scoped origin request and degrades safely when metadata is unavailable', async () => {
        const request = await call('prefetchOriginalRepoRequest', { cwd: '/fixture/repository' }) as any;
        expect(request).toMatchObject({ ok: true }); expect(request.requestEnvelope.request.payload.args).toEqual(['config', '--get', 'remote.origin.url']);
        expect(await call('prefetchOriginalRepo', { cwd: '/fixture/repository' })).toMatchObject({ ok: true, remoteRepository: null });
        expect(await call('prefetchOriginalRepo', { remoteOriginUrl: 'https://github.com/example/repo.git' })).toMatchObject({ ok: true, warning: expect.any(String) });
    });
    test('normalizes GitHub metadata and reports upstream errors without aborting the repository profile', async () => {
        PluginRegistry.configureCapabilities({ granted: ['system.network', 'system.network.https', 'system.network.scope.public-web-secure'] });
        const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ default_branch: 'main', description: 'Example', private: false, stargazers_count: 4 }) }); vi.stubGlobal('fetch', fetch);
        const response = await call('prefetchOriginalRepo', { cwd: '/fixture/repository', remoteOriginUrl: 'git@github.com:example/repo.git' }) as any;
        expect(response.remoteRepository).toMatchObject({ provider: 'github', repository: 'example/repo', defaultBranch: 'main', stars: 4 }); expect(fetch).toHaveBeenCalledTimes(1);
        fetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Unavailable', text: async () => 'Try later' });
        expect(await call('prefetchOriginalRepo', { remoteOriginUrl: 'https://github.com/example/repo' })).toMatchObject({ ok: true, warning: expect.stringContaining('503') });
    });
    test('filters/deduplicates assistant discovery and supports explicit AI providers and local fallback tasks', async () => {
        (globalThis as any).__FDO_AI_ASSISTANTS = [null, { id: 'one', name: 'First', purpose: 'automation', provider: 'local', model: 'small', default: true }, { id: 'one', name: 'Duplicate' }, { id: 'other', purpose: 'chat' }];
        expect(await call('fdo.ai.assistants.list.v1', { purpose: 'automation', provider: 'local', model: 'small' })).toMatchObject({ ok: true, assistants: [{ id: 'one', name: 'First' }] });
        for (const task of ['commit-message', 'summarize-output', 'suggest-next-command']) expect(await call('fdo.ai.request.v1', { task, repoPath: '/fixture/repo', summary: { staged: 2, modified: 1, untracked: 1, branch: 'main' }, commandOutput: 'file.ts changed\nSecond line' })).toMatchObject({ ok: true, source: 'fallback', message: expect.any(String) });
        (globalThis as any).__FDO_AI_REQUEST = vi.fn().mockResolvedValue({ commitMessage: 'feat: test provider' });
        expect(await call('fdo.ai.request.v1', { task: 'commit-message' })).toMatchObject({ ok: true, source: 'fdo-ai', commitMessage: 'feat: test provider' });
        (globalThis as any).__FDO_AI_LIST_ASSISTANTS = () => { throw Error('Discovery failed'); };
        expect(await call('fdo.ai.assistants.list.v1')).toMatchObject({ ok: false, code: 'AI_ASSISTANTS_LIST_FAILED' });
    });
});

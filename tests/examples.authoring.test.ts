import {EventEmitter} from 'node:events';
vi.mock('../examples/11-hosts-manager-plugin/styles/style.css', () => ({default:{}}));
const entries = [
    '01-basic-plugin','02-interactive-plugin','03-persistence-plugin','04-ui-extensions-plugin',
    '05-advanced-dom-plugin','06-error-handling-plugin','07-injected-libraries-demo',
    '08-privileged-actions-plugin','09-operator-plugin','10-system-file-plugin',
    '11-hosts-manager-plugin/index','12-git-operations-plugin','13-service-content-hub-plugin',
    '18-interactive-ssh-plugin','19-shared-logic-provider','20-shared-logic-consumer',
    'fixtures/minimal-plugin.fixture','fixtures/error-handling-plugin.fixture','fixtures/storage-plugin.fixture',
    'fixtures/operator-custom-tool-plugin.fixture','fixtures/operator-kubernetes-plugin.fixture','fixtures/operator-terraform-plugin.fixture',
];
test.each(entries)('%s starts through the registry, renders twice and releases its bridge', async entry => {
    vi.resetModules();
    const previousPort = (process as any).parentPort;
    const port = Object.assign(new EventEmitter(), {postMessage:vi.fn()});
    (process as any).parentPort = port;
    const {PluginRegistry, SharedLogic} = await import('../src');
    vi.spyOn(SharedLogic.prototype, 'register').mockReturnValue({ready:Promise.resolve(),dispose:async()=>{}});
    try {
        if (entry === '11-hosts-manager-plugin/index') await import('../examples/11-hosts-manager-plugin/index');
        else if (entry.startsWith('fixtures/')) await import(`../examples/fixtures/${entry.slice('fixtures/'.length)}.ts`);
        else await import(`../examples/${entry}.ts`);
        PluginRegistry.callInit();
        for (let i = 0; i < 2; i++) {
            const payload = PluginRegistry.callRenderer();
            expect(JSON.parse(payload.render!)).not.toMatch(/Error rendering plugin|failed to render/);
            expect(JSON.parse(payload.render!)).toMatch(/<[^>]+>/);
            expect(() => new Function(JSON.parse(payload.onLoad!))).not.toThrow();
        }
    } finally {
        await PluginRegistry.clearPlugin();
        expect(port.listenerCount('message')).toBe(0);
        vi.restoreAllMocks();
        (process as any).parentPort = previousPort;
    }
});

test('storage fixture acquires its store after plugin initialization', async () => {
    vi.resetModules();
    const previousPort = (process as any).parentPort;
    const port = Object.assign(new EventEmitter(), {postMessage: vi.fn()});
    (process as any).parentPort = port;
    const {PluginRegistry} = await import('../src');
    const useStore = vi.spyOn(PluginRegistry, 'useStore');

    try {
        await import('../examples/fixtures/storage-plugin.fixture');
        expect(useStore).not.toHaveBeenCalled();

        PluginRegistry.callInit();
        expect(useStore).toHaveBeenNthCalledWith(1, 'default');
        expect(useStore).toHaveBeenNthCalledWith(2, 'json');
        const payload = PluginRegistry.callRenderer();
        expect(JSON.parse(payload.render!)).toContain('non-persistent fallback');
    } finally {
        await PluginRegistry.clearPlugin();
        expect(port.listenerCount('message')).toBe(0);
        vi.restoreAllMocks();
        (process as any).parentPort = previousPort;
    }
});

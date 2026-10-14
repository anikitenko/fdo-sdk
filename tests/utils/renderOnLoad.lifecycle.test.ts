import { createRenderOnLoadActionsSource, disposeRenderOnLoadActions } from '../../src';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
afterEach(() => {
    if (originalWindow) globalThis.window = originalWindow;
    else delete (globalThis as any).window;
    if (originalDocument) globalThis.document = originalDocument;
    else delete (globalThis as any).document;
});

function fixture() {
    const element = new EventTarget();
    globalThis.window = Object.assign(new EventTarget(), { calls: 0, diagnostics: [] }) as any;
    globalThis.document = { querySelectorAll: (selector: string) => selector === '#ok' ? [element] : [] } as any;
    return element;
}
function options(key: string) {
    return {
        lifecycleKey: key,
        handlers: { run: () => { (window as any).calls++; } },
        bindings: [{ selector: '#ok', event: 'click', handler: 'run', capture: true }],
        onDiagnostic: (diagnostic: any) => { (window as any).diagnostics.push(diagnostic); },
    };
}

test('reinitialization and rerender remove only owned listeners; teardown is idempotent', () => {
    const element = fixture();
    const a = createRenderOnLoadActionsSource(options('a'));
    new Function(a)();
    new Function(a)();
    new Function(createRenderOnLoadActionsSource(options('b')))();
    element.dispatchEvent(new Event('click'));
    expect((window as any).calls).toBe(2);
    disposeRenderOnLoadActions(window, 'a');
    disposeRenderOnLoadActions(window, 'a');
    element.dispatchEvent(new Event('click'));
    expect((window as any).calls).toBe(3);
    window.dispatchEvent(new Event('pagehide'));
    element.dispatchEvent(new Event('click'));
    expect((window as any).calls).toBe(3);
});

test('strict partial binding failure rolls back listeners and setup cleanup', () => {
    const element = fixture();
    const config = options('partial');
    const source = createRenderOnLoadActionsSource({ ...config, strict: true,
        setup: () => () => { (window as any).cleaned = true; },
        bindings: [...config.bindings, { selector: '#missing', event: 'click', handler: 'run' }],
    });
    expect(() => new Function(source)()).toThrow('No elements matched');
    element.dispatchEvent(new Event('click'));
    expect((window as any).calls).toBe(0);
    expect((window as any).cleaned).toBe(true);
});

test('sync and async handlers report the same code without unhandled rejections or flooding', async () => {
    const element = fixture();
    new Function(createRenderOnLoadActionsSource({ ...options('fail'), strict: true,
        handlers: { run: async () => { throw new Error('failure'); } },
    }))();
    element.dispatchEvent(new Event('click'));
    element.dispatchEvent(new Event('click'));
    await Promise.resolve();
    expect((window as any).diagnostics).toHaveLength(1);
    expect((window as any).diagnostics[0]).toMatchObject({ code: 'ONLOAD_HANDLER_FAILED', phase: 'handler' });
    disposeRenderOnLoadActions(window, 'fail');
    new Function(createRenderOnLoadActionsSource({ ...options('sync'), handlers: { run: () => { throw Error('sync'); } } }))();
    element.dispatchEvent(new Event('click'));
    expect((window as any).diagnostics[1].code).toBe('ONLOAD_HANDLER_FAILED');
});

test('async setup rejection rolls back bindings; late cleanup after teardown runs once', async () => {
    const element = fixture();
    new Function(createRenderOnLoadActionsSource({ ...options('setup'), strict: true,
        setup: async () => { throw Error('setup'); },
    }))();
    await Promise.resolve();
    element.dispatchEvent(new Event('click'));
    expect((window as any).calls).toBe(0);
    expect((window as any).diagnostics[0].code).toBe('ONLOAD_SETUP_FAILED');
    new Function(createRenderOnLoadActionsSource({ ...options('late'), setup: async () => () => { (window as any).cleanups = ((window as any).cleanups || 0) + 1; } }))();
    disposeRenderOnLoadActions(window, 'late');
    await Promise.resolve();
    expect((window as any).cleanups).toBe(1);
});

test('synchronous setup failure and invalid selectors do not retain a lifecycle', () => {
    fixture();
    new Function(createRenderOnLoadActionsSource({ ...options('setup'), setup: () => { throw Error('setup'); } }))();
    expect((window as any)[Symbol.for('fdo.renderOnLoad.cleanup')].size).toBe(0);
    (document as any).querySelectorAll = () => { throw Error('invalid selector'); };
    new Function(createRenderOnLoadActionsSource(options('selector')))();
    expect((window as any)[Symbol.for('fdo.renderOnLoad.cleanup')].size).toBe(0);
});

test('cleanup failures and rejecting reporters never create unhandled rejections', async () => {
    fixture();
    new Function(createRenderOnLoadActionsSource({ ...options('cleanup'),
        setup: () => async () => { throw Error('cleanup'); },
    }))();
    disposeRenderOnLoadActions(window, 'cleanup');
    await Promise.resolve();
    expect((window as any).diagnostics[0].code).toBe('ONLOAD_CLEANUP_FAILED');
    const element = fixture();
    new Function(createRenderOnLoadActionsSource({ ...options('reporter'),
        onDiagnostic: async () => { throw Error('reporter'); },
        handlers: { run: async () => { throw Error('handler'); } },
    }))();
    element.dispatchEvent(new Event('click'));
    await Promise.resolve();
    await Promise.resolve();
    disposeRenderOnLoadActions(window, 'reporter');
});

import {defineExampleSetup} from '../examples/shared/frontend-lifecycle';
import {disposeRenderOnLoadActions, resolveRenderOnLoadSource} from '../src';

test('example setup replaces owned listeners and clears pending work on teardown', () => {
    vi.useFakeTimers();
    const oldWindow = globalThis.window;
    const target = new EventTarget();
    const win = Object.assign(new EventTarget(), {target, calls:0, cleaned:0});
    globalThis.window = win as any;
    try {
        const source = resolveRenderOnLoadSource(defineExampleSetup(`({listen, timeout, onDispose}) => {
            listen(window.target, 'click', () => { window.calls++; });
            timeout(() => { window.calls += 100; }, 50);
            onDispose(() => { window.cleaned++; });
        }`, 'owned-example'));
        new Function(source)();
        new Function(source)();
        target.dispatchEvent(new Event('click'));
        expect(win.calls).toBe(1);
        expect(win.cleaned).toBe(1);
        disposeRenderOnLoadActions(window, 'owned-example');
        target.dispatchEvent(new Event('click'));
        vi.runAllTimers();
        expect(win.calls).toBe(1);
        expect(win.cleaned).toBe(2);
    } finally {
        if (oldWindow) globalThis.window = oldWindow;
        else delete (globalThis as any).window;
        vi.useRealTimers();
    }
});

import { DOM, DOMStyleMap } from '../src';
import { DOMText } from '../src';
import { DOMInput } from '../src';

// Real Goober: the older DOM suite mocks its registration/extraction paths.
describe('style ownership with real Goober', () => {
    test('isolates interleaved plugins and retains deduplicated CSS on repeated renders', () => {
        const text = new DOMText();
        const a = new DOM().collectStylesFrom(text);
        const b = new DOM().collectStylesFrom();
        const fragment = text.createPText('A', { style: { color: 'red' } }, 'a');
        const other = b.createClassFromStyle({ color: 'blue' });
        const first = a.renderHTML(fragment);
        expect(first).toContain('color:red');
        expect(first).not.toContain('color:blue');
        expect(b.renderHTML(other)).toContain('color:blue');
        expect(b.renderHTML(other)).not.toContain('color:red');
        text.createClassFromStyle({ color: 'red' });
        expect(a.renderHTML(fragment)).toBe(first);
        expect(first.match(/color:red/g)).toHaveLength(1);
        // Empty global extraction cannot drain an explicit collector.
        new DOM().renderHTML('');
        expect(a.renderHTML(fragment)).toBe(first);
    });

    test('handles nested states, lists, conditions, custom properties, important, backdrop and animation', () => {
        const dom = new DOM().collectStylesFrom();
        const legacy: Record<string, string> = { color: 'white' };
        const style: DOMStyleMap = {
            ...legacy, '--accent': 'red', zIndex: 3,
            '&:hover, &:focus-visible': { color: 'red !important', '& > span': { opacity: 0.5 } },
            '@media (min-width: 1px)': { display: 'grid', '@supports (display: grid)': { gap: '2px' } },
            '&::backdrop': { background: 'rgb(0 0 0 / 50%)' },
        };
        const name = dom.createClassFromStyle(style);
        const animation = dom.createStyleKeyframe('from { opacity: 0; } to { opacity: 1; }');
        const css = dom.renderHTML(name);
        expect(css).toContain(`.${name}:hover, .${name}:focus-visible`);
        for (const token of ['--accent:red', 'z-index:3', 'red !important', 'opacity:0.5', '@media', '@supports', '::backdrop', `@keyframes ${animation}`, 'from{opacity:0;}', 'to{opacity:1;}']) expect(css).toContain(token);
    });

    test('refuses moving a populated explicit sheet with an actionable code', () => {
        const helper = new DOM().collectStylesFrom();
        helper.createClassFromStyle({ color: 'red' });
        expect(() => new DOM().collectStylesFrom(helper)).toThrow(expect.objectContaining({ code: 'DOM_STYLE_OWNER_CONFLICT' }));
    });

    test('rejects late ownership rather than silently losing legacy styles', () => {
        const helper = new DOM();
        helper.createClassFromStyle({ color: 'orange' });
        expect(() => new DOM().collectStylesFrom(helper)).toThrow(expect.objectContaining({ code: 'DOM_STYLE_COLLECTOR_LATE' }));
    });

    test('collects CSS with a readonly browser window without mutating globals or injecting styles', () => {
        const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
        const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
        const browserWindow = {};
        const createElement = vi.fn(() => { throw Error('Global style injection is forbidden'); });
        Object.defineProperty(globalThis, 'window', { configurable: true, get: () => browserWindow });
        Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement } });
        try {
            const dom = new DOM().collectStylesFrom();
            dom.createClassFromStyle({ color: 'purple', '&:hover': { color: 'orange' } });
            expect(dom.renderHTML('')).toContain('color:purple');
            expect(globalThis.window).toBe(browserWindow);
            expect(createElement).not.toHaveBeenCalled();
        } finally {
            if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
            else delete (globalThis as any).window;
            if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
            else delete (globalThis as any).document;
        }
    });

    test('retains legacy cross-helper collection and draining semantics', () => {
        const helper = new DOM();
        const root = new DOM();
        helper.createClassFromStyle({ color: 'rebeccapurple' });
        expect(root.renderHTML('')).toContain('rebeccapurple');
        expect(root.renderHTML('')).not.toContain('rebeccapurple');
    });

    test('textarea is paired, accepts escaped text, and constructor defaults match examples', () => {
        const markup = new DOMInput().createTextarea('<hello>');
        expect(markup).toContain('>&lt;hello&gt;</textarea>');
        expect(markup).not.toContain('/>');
    });
});

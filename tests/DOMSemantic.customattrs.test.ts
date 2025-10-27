import {DOMSemantic} from "../src";

describe("DOMSemantic customAttributes coverage", () => {
    const dom = new DOMSemantic();

    const methods = [
        'createArticle',
        'createSection',
        'createNav',
        'createHeader',
        'createFooter',
        'createAside',
        'createMain'
    ] as const;

    methods.forEach((m) => {
        it(`${m} with customAttributes and style should render attributes and class`, () => {
            const fn: any = (dom as any)[m];
            expect(typeof fn).toBe('function');
            const out = fn.call(dom, [], { customAttributes: { 'data-s': '1' }, style: { margin: '0' } }, 's-id');
            expect(out).toContain('data-s="1"');
            expect(out).toContain('id="s-id"');
            expect(out).toMatch(/className="[^"]+"/);
        });
    });
});

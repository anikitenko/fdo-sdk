import {DOMSemantic} from "../src";

describe("DOMSemantic coverage extras 2", () => {
    let dom: DOMSemantic;

    beforeEach(() => {
        dom = new DOMSemantic();
    });

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
        it(`should apply style and id for ${m}`, () => {
            // @ts-ignore - dynamic method call for testing
            const out = (dom as any)[m]([], { style: { padding: '1px' } }, 'fixed-id');
            expect(out).toContain('id="fixed-id"');
            expect(out).toMatch(/className="[^"]+"/);
        });
    });
});

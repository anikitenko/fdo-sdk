import {DOMSemantic} from "../src";

describe("DOMSemantic coverage extras", () => {
    let dom: DOMSemantic;

    beforeEach(() => {
        dom = new DOMSemantic();
    });

    it("createClassFromStyle returns a class name", () => {
        const cls = dom.createClassFromStyle({ margin: '0', color: 'blue' });
        expect(typeof cls).toBe('string');
        expect(cls.length).toBeGreaterThan(0);
    });

    it("createStyleKeyframe returns a keyframe class", () => {
        const kf = dom.createStyleKeyframe(`from{opacity:0} to{opacity:1}`);
        expect(typeof kf).toBe('string');
        expect(kf.length).toBeGreaterThan(0);
    });

    it("renderHTML injects style and script placeholders", () => {
        const out = dom.renderHTML('<div>Hi</div>');
        expect(out).toContain('plugin-script-placeholder');
        expect(out).toMatch(/<style>\{`[\s\S]*`\}<\/style>/);
    });
});

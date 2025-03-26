import {DOMMisc} from "../src";

describe("DOMMisc", () => {
    let domMisc: DOMMisc;

    beforeEach(() => {
        jest.clearAllMocks();
        domMisc = new DOMMisc();
    });

    it("should be defined", () => {
        expect(domMisc).toBeDefined();
    });

    it("should create a divider with correct default options", () => {
        const divider = domMisc.divider({classes: ["test"]}, "test");
        expect(divider.toString()).toBe(`<hr id="test" className="test go2473750146"></hr>`)
    })

    test("divider with no options or id", () => {
        const output = domMisc.divider();
        expect(output).toContain("<hr");
        expect(output).toContain("class");
    });

    test("divider with custom classes and disableDefaultClass", () => {
        const output = domMisc.divider({
            classes: ["custom-class"],
            disableDefaultClass: true,
        });

        expect(output).toContain("custom-class");
        expect(output).not.toContain("default");
    });

    test("divider with custom styles", () => {
        const output = domMisc.divider({
            style: {
                margin: "50px",
                color: "red"
            }
        });

        expect(output).toMatch(/go[a-z0-9]+/);
    });

    test("divider with custom id and style (to cover options?.style truthy branch)", () => {
        const output = domMisc.divider({
            style: { margin: "20px" }
        }, "divider-123");

        expect(output).toContain("id=\"divider-123\"");
        expect(output).toContain("className=\"go");
        expect(output).toMatch(/<hr id="divider-123" className="go\d+"><\/hr>/);
        expect(output.match(/go\d+/)).not.toBeNull();
        expect(output).toMatch(/className="go[0-9]+"/);
    });

    test("divider with options.style = undefined", () => {
        const output = domMisc.divider({ style: {"undefined": "undefined"} });
        expect(output).toContain("<hr");
    });

    test("divider with options but style is undefined", () => {
        const output = domMisc.divider({
            classes: ["with-style"],
            style: undefined,
        });

        expect(output).toContain("with-style");
    });

    test("divider with options missing .style property", () => {
        const output = domMisc.divider({ classes: ['just-class'] });
        expect(output).toContain('just-class');
    });

    test("divider with options but no style property (forces undefined)", () => {
        const options = {
            disableDefaultClass: true,
        };

        const output = domMisc.divider(options);
        expect(output).toContain("<hr");
    });

    test("divider with defined style (forces spread)", () => {
        const output = domMisc.divider({
            style: {
                color: "red",
                padding: "0",
            }
        });

        expect(output).toContain("go");
    });

    test("divider with options including disableDefaultClass", () => {
        const output = domMisc.divider({
            disableDefaultClass: true
        });

        expect(output).toContain("<hr");
    });

    test("divider with custom style", () => {
        const output = domMisc.divider({ style: { padding: "5px" } }, "divider-123");
        expect(output).toMatch(/<hr id="divider-123" className="go\d+"><\/hr>/);
    });

    test("divider with disableDefaultClass and custom ID", () => {
        const output = domMisc.divider({ disableDefaultClass: true }, "my-divider");
        expect(output).toContain('id="my-divider"');
    });

    test("divider with options that omit style (falsy branch)", () => {
        const output = domMisc.divider({ classes: ['foo'] });
        expect(output).toContain("foo");
    });

    test("divider with custom style (truthy branch)", () => {
        const output = domMisc.divider({ style: { padding: "5px" } });
        expect(output).toMatch(/className="go\d+"/);
    });
})
import {
    emitDeprecationWarning,
    formatDeprecationMessage,
    resetDeprecationWarningsForTests,
} from "../../src/utils/deprecation";

describe("deprecation", () => {
    beforeEach(() => {
        resetDeprecationWarningsForTests();
    });

    test("formats deprecation messages with replacement metadata", () => {
        const message = formatDeprecationMessage({
            id: "api.oldMethod",
            message: "oldMethod() is deprecated.",
            replacement: "newMethod()",
            removeIn: "2.0.0",
            docsUrl: "https://example.com/migration",
        });

        expect(message).toContain("[DEPRECATED:api.oldMethod]");
        expect(message).toContain("Use newMethod() instead.");
        expect(message).toContain("Planned removal: 2.0.0.");
        expect(message).toContain("Docs: https://example.com/migration");
    });

    test("emits each deprecation notice only once per id", () => {
        const warn = vi.fn();

        emitDeprecationWarning(
            { id: "api.oldMethod", message: "oldMethod() is deprecated." },
            warn
        );
        emitDeprecationWarning(
            { id: "api.oldMethod", message: "oldMethod() is deprecated." },
            warn
        );

        expect(warn).toHaveBeenCalledTimes(1);
    });
});

import {
    formatDiagnosticExactFix,
    getDiagnosticFixTemplate,
    listDiagnosticFixTemplates,
} from "../../src";

describe("diagnostic fix templates", () => {
    test("returns template for known code", () => {
        const template = getDiagnosticFixTemplate("capability_missing");

        expect(template).not.toBeNull();
        expect(template?.code).toBe("CAPABILITY_MISSING");
        expect(template?.exactFix).toContain("PLUGIN_INIT.content.capabilities");
        expect(template?.steps.length).toBeGreaterThan(0);
    });

    test("returns null for unknown code", () => {
        expect(getDiagnosticFixTemplate("UNKNOWN_CODE")).toBeNull();
        expect(formatDiagnosticExactFix("UNKNOWN_CODE")).toBeNull();
    });

    test("formats exact fix line for known code", () => {
        const line = formatDiagnosticExactFix("PROCESS_EXIT_NON_ZERO");
        expect(line).toContain("Process command failed");
        expect(line).toContain("Surface full host diagnostics");
    });

    test("lists templates in deterministic order", () => {
        const templates = listDiagnosticFixTemplates();
        expect(templates.length).toBeGreaterThanOrEqual(7);
        const codes = templates.map((entry) => entry.code);
        const sortedCodes = [...codes].sort((left, right) => left.localeCompare(right));
        expect(codes).toEqual(sortedCodes);
        expect(codes).toContain("HANDSHAKE_API_INCOMPATIBLE");
        expect(codes).toContain("HANDSHAKE_CONTRACT_INCOMPATIBLE");
        expect(codes).toContain("PLUGIN_BACKEND_EMPTY_RESPONSE");
    });
});

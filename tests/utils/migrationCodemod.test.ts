import { applySdkMigrationCodemod } from "../../src/utils/migrationCodemod";

describe("sdk migration codemod", () => {
    test("replaces legacy privileged envelope fallback chain and injects helper import", () => {
        const input = [
            "async function run() {",
            "  const envelope = await window.createBackendReq(\"UI_MESSAGE\", {});",
            "  const requestPayload = envelope?.result?.request ?? envelope?.request ?? envelope;",
            "  return requestPayload;",
            "}",
            "",
        ].join("\n");

        const result = applySdkMigrationCodemod(input);

        expect(result.changed).toBe(true);
        expect(result.output).toContain("import { extractPrivilegedActionRequest } from \"@anikitenko/fdo-sdk\";");
        expect(result.output).toContain("const requestPayload = extractPrivilegedActionRequest(envelope);");
        expect(result.changes.some((entry) => entry.rule === "privileged-envelope-extract-helper")).toBe(true);
    });

    test("extends existing sdk import without duplicating entries", () => {
        const input = [
            "import { requestPrivilegedAction } from \"@anikitenko/fdo-sdk\";",
            "",
            "const envelope = payload;",
            "const requestPayload = envelope?.result?.request ?? envelope?.request ?? envelope;",
            "",
        ].join("\n");

        const result = applySdkMigrationCodemod(input);
        expect(result.changed).toBe(true);
        expect(result.output).toContain("import { requestPrivilegedAction, extractPrivilegedActionRequest } from \"@anikitenko/fdo-sdk\";");
    });

    test("replaces deprecated configureCapabilityPolicy usage", () => {
        const input = "PluginRegistry.configureCapabilityPolicy({ granted: [\"storage\", \"storage.json\"] });";
        const result = applySdkMigrationCodemod(input);

        expect(result.changed).toBe(true);
        expect(result.output).toBe("PluginRegistry.configureCapabilities({ granted: [\"storage\", \"storage.json\"] });");
        expect(result.changes.some((entry) => entry.rule === "plugin-registry-configure-capabilities")).toBe(true);
    });

    test("is idempotent when source already uses modern patterns", () => {
        const input = [
            "import { extractPrivilegedActionRequest } from \"@anikitenko/fdo-sdk\";",
            "const requestPayload = extractPrivilegedActionRequest(envelope);",
            "PluginRegistry.configureCapabilities({ granted: [] });",
        ].join("\n");

        const result = applySdkMigrationCodemod(input);
        expect(result.changed).toBe(false);
        expect(result.output).toBe(input);
        expect(result.changes).toEqual([]);
    });
});

import {
    getEditorSupportBundle,
    getEditorSupportMonacoPolicy,
    getEditorSupportPackageJson,
    getEditorSupportPackageManifest,
    SDK_EDITOR_INDEX_TYPES_VIRTUAL_PATH,
    SDK_EDITOR_MODULE_ID,
    SDK_EDITOR_PACKAGE_JSON_VIRTUAL_PATH,
} from "../../src/utils/editorSupport";

describe("editor support helpers", () => {
    test("returns default editor package manifest", () => {
        const manifest = getEditorSupportPackageManifest();

        expect(manifest.name).toBe(SDK_EDITOR_MODULE_ID);
        expect(manifest.private).toBe(true);
        expect(manifest.types).toBe("./index.d.ts");
        expect(manifest.exports["."].types).toBe("./index.d.ts");
    });

    test("applies manifest overrides predictably", () => {
        const manifest = getEditorSupportPackageManifest({
            private: false,
            exports: {
                ".": {
                    types: "./custom-index.d.ts",
                    default: "./custom.js",
                },
            },
        });

        expect(manifest.private).toBe(false);
        expect(manifest.exports["."].types).toBe("./custom-index.d.ts");
        expect(manifest.exports["."].default).toBe("./custom.js");
    });

    test("serializes package manifest as JSON", () => {
        const manifest = getEditorSupportPackageManifest();
        const json = getEditorSupportPackageJson(manifest);
        const parsed = JSON.parse(json);

        expect(parsed).toEqual(manifest);
    });

    test("returns full editor support bundle", () => {
        const bundle = getEditorSupportBundle();

        expect(bundle.moduleId).toBe(SDK_EDITOR_MODULE_ID);
        expect(bundle.packageJson).toContain("\"types\": \"./index.d.ts\"");
        expect(bundle.renderOnLoadTypeDefinitions).toContain("declare namespace FDOOnLoad");
        expect(Array.isArray(bundle.renderOnLoadHints)).toBe(true);
        expect(bundle.renderOnLoadHints.length).toBeGreaterThan(0);
    });

    test("creates monaco policy that injects package.json when SDK index exists", () => {
        const policy = getEditorSupportMonacoPolicy({ hasSdkIndex: true });

        expect(policy.moduleId).toBe(SDK_EDITOR_MODULE_ID);
        expect(policy.hasSdkIndex).toBe(true);
        expect(policy.shouldInjectPackageJson).toBe(true);
        expect(policy.packageJsonVirtualPath).toBe(SDK_EDITOR_PACKAGE_JSON_VIRTUAL_PATH);
        expect(policy.indexTypesVirtualPath).toBe(SDK_EDITOR_INDEX_TYPES_VIRTUAL_PATH);
        expect(policy.packageJson).toContain("\"name\": \"@anikitenko/fdo-sdk\"");
    });

    test("uses namespace-only fallback policy when SDK index is missing", () => {
        const policy = getEditorSupportMonacoPolicy({ hasSdkIndex: false });

        expect(policy.hasSdkIndex).toBe(false);
        expect(policy.shouldInjectPackageJson).toBe(false);
        expect(policy.preferNamespaceFallback).toBe(true);
        expect(policy.allowModuleFallback).toBe(false);
        expect(policy.namespaceFallbackTypeDefinitions).toContain("declare namespace FDOOnLoad");
        expect(policy.namespaceFallbackTypeDefinitions).not.toContain("declare module \"@anikitenko/fdo-sdk\"");
        expect(policy.deprecatedModuleFallbackPattern).toBe("declare module \"@anikitenko/fdo-sdk\"");
    });

    test("honors explicit namespace fallback overrides", () => {
        const policy = getEditorSupportMonacoPolicy({
            hasSdkIndex: false,
            namespaceFallbackTypeDefinitions: "declare namespace FDOOnLoad { interface Marker {} }",
        });

        expect(policy.namespaceFallbackTypeDefinitions).toContain("interface Marker");
    });
});

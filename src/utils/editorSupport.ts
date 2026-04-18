import { RenderOnLoadHint } from "../types";
import { getRenderOnLoadMonacoHints, getRenderOnLoadMonacoTypeDefinitions } from "./renderOnLoad";

export const SDK_EDITOR_MODULE_ID = "@anikitenko/fdo-sdk";
export const SDK_EDITOR_PACKAGE_JSON_VIRTUAL_PATH = `/node_modules/${SDK_EDITOR_MODULE_ID}/package.json`;
export const SDK_EDITOR_INDEX_TYPES_VIRTUAL_PATH = `/node_modules/${SDK_EDITOR_MODULE_ID}/index.d.ts`;

export type EditorSupportPackageManifest = {
    name: string;
    private: boolean;
    types: string;
    exports: {
        ".": {
            types: string;
            default: string;
        };
    };
};

export type EditorSupportBundle = {
    moduleId: string;
    packageManifest: EditorSupportPackageManifest;
    packageJson: string;
    renderOnLoadTypeDefinitions: string;
    renderOnLoadHints: RenderOnLoadHint[];
};

export type EditorSupportMonacoPolicyOptions = {
    hasSdkIndex: boolean;
    namespaceFallbackTypeDefinitions?: string;
};

export type EditorSupportMonacoPolicy = {
    moduleId: string;
    hasSdkIndex: boolean;
    shouldInjectPackageJson: boolean;
    packageJsonVirtualPath: string;
    packageJson: string;
    indexTypesVirtualPath: string;
    namespaceFallbackTypeDefinitions: string;
    preferNamespaceFallback: true;
    allowModuleFallback: false;
    deprecatedModuleFallbackPattern: string;
    guidance: string[];
};

const DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST: EditorSupportPackageManifest = {
    name: SDK_EDITOR_MODULE_ID,
    private: true,
    types: "./index.d.ts",
    exports: {
        ".": {
            types: "./index.d.ts",
            default: "./dist/fdo-sdk.bundle.js",
        },
    },
};

export function getEditorSupportPackageManifest(
    overrides: Partial<EditorSupportPackageManifest> = {}
): EditorSupportPackageManifest {
    return {
        name: overrides.name ?? DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST.name,
        private:
            typeof overrides.private === "boolean"
                ? overrides.private
                : DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST.private,
        types: overrides.types ?? DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST.types,
        exports: {
            ".": {
                types:
                    overrides.exports?.["."]?.types
                    ?? DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST.exports["."].types,
                default:
                    overrides.exports?.["."]?.default
                    ?? DEFAULT_EDITOR_SUPPORT_PACKAGE_MANIFEST.exports["."].default,
            },
        },
    };
}

export function getEditorSupportPackageJson(
    manifest: EditorSupportPackageManifest = getEditorSupportPackageManifest()
): string {
    return JSON.stringify(manifest, null, 2);
}

export function getEditorSupportBundle(): EditorSupportBundle {
    const packageManifest = getEditorSupportPackageManifest();
    return {
        moduleId: SDK_EDITOR_MODULE_ID,
        packageManifest,
        packageJson: getEditorSupportPackageJson(packageManifest),
        renderOnLoadTypeDefinitions: getRenderOnLoadMonacoTypeDefinitions(),
        renderOnLoadHints: getRenderOnLoadMonacoHints(),
    };
}

export function getEditorSupportMonacoPolicy(
    options: EditorSupportMonacoPolicyOptions
): EditorSupportMonacoPolicy {
    const hasSdkIndex = options.hasSdkIndex === true;
    const packageManifest = getEditorSupportPackageManifest();
    const packageJson = getEditorSupportPackageJson(packageManifest);
    const namespaceFallbackTypeDefinitions =
        options.namespaceFallbackTypeDefinitions
        ?? getRenderOnLoadMonacoTypeDefinitions();

    return {
        moduleId: SDK_EDITOR_MODULE_ID,
        hasSdkIndex,
        shouldInjectPackageJson: hasSdkIndex,
        packageJsonVirtualPath: SDK_EDITOR_PACKAGE_JSON_VIRTUAL_PATH,
        packageJson,
        indexTypesVirtualPath: SDK_EDITOR_INDEX_TYPES_VIRTUAL_PATH,
        namespaceFallbackTypeDefinitions,
        preferNamespaceFallback: true,
        allowModuleFallback: false,
        deprecatedModuleFallbackPattern: `declare module "${SDK_EDITOR_MODULE_ID}"`,
        guidance: [
            "Use hasSdkIndex to decide editor fallback behavior.",
            "Inject virtual package.json only when SDK index.d.ts is present.",
            "Use namespace-only fallback for renderOnLoad typings; do not reintroduce module-level declare module fallback.",
        ],
    };
}

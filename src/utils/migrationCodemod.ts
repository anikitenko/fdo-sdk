export type SdkMigrationRuleId =
    | "privileged-envelope-extract-helper"
    | "plugin-registry-configure-capabilities";

export type SdkMigrationChange = {
    rule: SdkMigrationRuleId;
    replacements: number;
    description: string;
};

export type SdkMigrationResult = {
    output: string;
    changed: boolean;
    changes: SdkMigrationChange[];
};

const SDK_IMPORT_MODULE = "@anikitenko/fdo-sdk";
const EXTRACT_PRIVILEGED_ACTION_REQUEST = "extractPrivilegedActionRequest";

function hasNamedImport(importList: string, importName: string): boolean {
    return importList
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .some((entry) => entry.split(/\s+as\s+/u)[0].trim() === importName);
}

function ensureNamedImport(source: string, importName: string): { output: string; changed: boolean } {
    const namedImportPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']@anikitenko\/fdo-sdk["'];?/u;
    const namedImportMatch = source.match(namedImportPattern);

    if (namedImportMatch) {
        const existingNames = namedImportMatch[1] ?? "";
        if (hasNamedImport(existingNames, importName)) {
            return { output: source, changed: false };
        }

        const imports = existingNames
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
        imports.push(importName);

        const replacement = `import { ${imports.join(", ")} } from "${SDK_IMPORT_MODULE}";`;
        const output = source.replace(namedImportPattern, replacement);
        return { output, changed: true };
    }

    const importLine = `import { ${importName} } from "${SDK_IMPORT_MODULE}";`;
    const lines = source.split("\n");
    let lastImportIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
        if (/^\s*import\s/u.test(lines[index])) {
            lastImportIndex = index;
        }
    }

    if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importLine);
        return { output: lines.join("\n"), changed: true };
    }

    return { output: `${importLine}\n${source}`, changed: true };
}

function applyPrivilegedEnvelopeExtractRule(source: string): {
    output: string;
    replacementCount: number;
    importAdded: boolean;
} {
    const pattern = /(\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)([A-Za-z_$][\w$]*)\s*\?\.\s*result\s*\?\.\s*request\s*\?\?\s*\2\s*\?\.\s*request\s*\?\?\s*\2(\s*;)/gu;
    let replacementCount = 0;

    const replaced = source.replace(pattern, (_fullMatch, declaration: string, envelopeVar: string, suffix: string) => {
        replacementCount += 1;
        return `${declaration}${EXTRACT_PRIVILEGED_ACTION_REQUEST}(${envelopeVar})${suffix}`;
    });

    if (replacementCount === 0) {
        return { output: source, replacementCount: 0, importAdded: false };
    }

    const withImport = ensureNamedImport(replaced, EXTRACT_PRIVILEGED_ACTION_REQUEST);
    return {
        output: withImport.output,
        replacementCount,
        importAdded: withImport.changed,
    };
}

function applyConfigureCapabilitiesRule(source: string): { output: string; replacementCount: number } {
    const pattern = /\.configureCapabilityPolicy\s*\(/gu;
    let replacementCount = 0;
    const output = source.replace(pattern, () => {
        replacementCount += 1;
        return ".configureCapabilities(";
    });
    return { output, replacementCount };
}

export function applySdkMigrationCodemod(source: string): SdkMigrationResult {
    let output = source;
    const changes: SdkMigrationChange[] = [];

    const envelopeRule = applyPrivilegedEnvelopeExtractRule(output);
    output = envelopeRule.output;
    if (envelopeRule.replacementCount > 0) {
        changes.push({
            rule: "privileged-envelope-extract-helper",
            replacements: envelopeRule.replacementCount,
            description: envelopeRule.importAdded
                ? "Replaced legacy privileged-envelope fallback chain and ensured extract helper import."
                : "Replaced legacy privileged-envelope fallback chain.",
        });
    }

    const configureRule = applyConfigureCapabilitiesRule(output);
    output = configureRule.output;
    if (configureRule.replacementCount > 0) {
        changes.push({
            rule: "plugin-registry-configure-capabilities",
            replacements: configureRule.replacementCount,
            description: "Replaced deprecated configureCapabilityPolicy(...) with configureCapabilities(...).",
        });
    }

    return {
        output,
        changed: output !== source,
        changes,
    };
}

declare const __FDO_SDK_PACKAGE_VERSION__: string | undefined;

export const SDK_API_VERSION = "1.0.0";

function resolveDefinedPackageVersion(): string | undefined {
    if (typeof __FDO_SDK_PACKAGE_VERSION__ === "string" && __FDO_SDK_PACKAGE_VERSION__.trim().length > 0) {
        return __FDO_SDK_PACKAGE_VERSION__.trim();
    }

    const envVersion = typeof process !== "undefined"
        ? (process.env?.FDO_SDK_PACKAGE_VERSION ?? process.env?.npm_package_version)
        : undefined;
    if (typeof envVersion === "string" && envVersion.trim().length > 0) {
        return envVersion.trim();
    }

    return undefined;
}

export const SDK_PACKAGE_VERSION = resolveDefinedPackageVersion() ?? "0.0.0-dev";

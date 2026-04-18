#!/usr/bin/env node
const path = require("node:path");
const process = require("node:process");
const { pathToFileURL } = require("node:url");

async function main() {
    const [, , command, ...args] = process.argv;
    if (command === "--help" || command === "-h" || !command) {
        process.stdout.write([
            "fdo-sdk",
            "",
            "Usage:",
            "  fdo-sdk migrate [--target <path>] [--write]",
            "",
            "Commands:",
            "  migrate   Run SDK migration codemods for plugin/source files.",
        ].join("\n") + "\n");
        return;
    }

    if (command !== "migrate") {
        throw new Error(`Unknown command "${command}". Run "fdo-sdk --help" for usage.`);
    }

    const scriptPath = path.resolve(__dirname, "../scripts/fdo-sdk-migrate.mjs");
    const scriptModule = await import(pathToFileURL(scriptPath).href);
    if (typeof scriptModule.run !== "function") {
        throw new Error("Migration script does not export run(...).");
    }
    await scriptModule.run(args);
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`fdo-sdk command failed: ${message}\n`);
    process.exit(1);
});

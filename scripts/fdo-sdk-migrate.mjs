#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".idea", "coverage"]);

function printHelp() {
  console.log([
    "fdo-sdk migrate",
    "",
    "Usage:",
    "  fdo-sdk migrate [--target <path>] [--write]",
    "  node scripts/fdo-sdk-migrate.mjs [--target <path>] [--write]",
    "",
    "Options:",
    "  --target <path>   Directory to scan (default: current working directory).",
    "  --write           Apply changes in-place. Without this flag, command runs in dry-run mode.",
    "  --help            Show this message.",
    "",
    "Rules:",
    "  - replace legacy privileged envelope fallback chain with extractPrivilegedActionRequest(...)",
    "  - replace deprecated PluginRegistry.configureCapabilityPolicy(...) with configureCapabilities(...)",
  ].join("\n"));
}

function parseArgs(rawArgs) {
  const options = {
    target: process.cwd(),
    write: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--target") {
      const value = rawArgs[index + 1];
      if (!value) {
        throw new Error("Missing value for --target");
      }
      options.target = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--target=")) {
      options.target = path.resolve(arg.slice("--target=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function hasNamedImport(importList, importName) {
  return importList
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => entry.split(/\s+as\s+/u)[0].trim() === importName);
}

function ensureExtractHelperImport(source) {
  const importName = "extractPrivilegedActionRequest";
  const moduleName = "@anikitenko/fdo-sdk";
  const namedImportPattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']@anikitenko\/fdo-sdk["'];?/u;
  const namedImportMatch = source.match(namedImportPattern);

  if (namedImportMatch) {
    const existingNames = namedImportMatch[1] ?? "";
    if (hasNamedImport(existingNames, importName)) {
      return source;
    }

    const imports = existingNames
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    imports.push(importName);
    const replacement = `import { ${imports.join(", ")} } from "${moduleName}";`;
    return source.replace(namedImportPattern, replacement);
  }

  const importLine = `import { ${importName} } from "${moduleName}";`;
  const lines = source.split("\n");
  let lastImportIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*import\s/u.test(lines[index])) {
      lastImportIndex = index;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join("\n");
  }

  return `${importLine}\n${source}`;
}

function applyMigrations(source) {
  let output = source;
  const ruleHits = [];

  const privilegedPattern = /(\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*)([A-Za-z_$][\w$]*)\s*\?\.\s*result\s*\?\.\s*request\s*\?\?\s*\2\s*\?\.\s*request\s*\?\?\s*\2(\s*;)/gu;
  let privilegedCount = 0;
  output = output.replace(privilegedPattern, (_match, declaration, envelopeVar, suffix) => {
    privilegedCount += 1;
    return `${declaration}extractPrivilegedActionRequest(${envelopeVar})${suffix}`;
  });
  if (privilegedCount > 0) {
    output = ensureExtractHelperImport(output);
    ruleHits.push({ rule: "privileged-envelope-extract-helper", count: privilegedCount });
  }

  const configurePattern = /\.configureCapabilityPolicy\s*\(/gu;
  let configureCount = 0;
  output = output.replace(configurePattern, () => {
    configureCount += 1;
    return ".configureCapabilities(";
  });
  if (configureCount > 0) {
    ruleHits.push({ rule: "plugin-registry-configure-capabilities", count: configureCount });
  }

  return {
    output,
    changed: output !== source,
    ruleHits,
  };
}

async function walkFiles(targetDir) {
  const info = await stat(targetDir);
  if (!info.isDirectory()) {
    return [targetDir];
  }

  const discovered = [];
  const entries = await readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      discovered.push(...(await walkFiles(path.join(targetDir, entry.name))));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      continue;
    }
    discovered.push(path.join(targetDir, entry.name));
  }

  return discovered;
}

export async function run(rawArgs = process.argv.slice(2)) {
  const options = parseArgs(rawArgs);
  if (options.help) {
    printHelp();
    return;
  }

  const targetStat = await stat(options.target).catch(() => null);
  if (!targetStat) {
    throw new Error(`Target path does not exist: ${options.target}`);
  }

  const files = await walkFiles(options.target);
  let changedFiles = 0;
  const reportLines = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const result = applyMigrations(source);
    if (!result.changed) {
      continue;
    }

    changedFiles += 1;
    const relative = path.relative(process.cwd(), filePath) || filePath;
    const rules = result.ruleHits
      .map((entry) => `${entry.rule} x${entry.count}`)
      .join(", ");
    reportLines.push(`- ${relative}: ${rules}`);

    if (options.write) {
      await writeFile(filePath, result.output, "utf8");
    }
  }

  const mode = options.write ? "write" : "dry-run";
  console.log(`fdo-sdk migrate (${mode})`);
  console.log(`Target: ${options.target}`);
  console.log(`Scanned files: ${files.length}`);
  console.log(`${options.write ? "Updated files" : "Files to update"}: ${changedFiles}`);
  if (reportLines.length > 0) {
    for (const line of reportLines) {
      console.log(line);
    }
  }

  if (!options.write && changedFiles > 0) {
    console.log("Run again with --write to apply these changes.");
  }
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (isDirectExecution) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`fdo-sdk migrate failed: ${message}`);
    process.exit(1);
  });
}

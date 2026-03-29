import fs from "node:fs";
import path from "node:path";

export function normalizeRelativePath(value) {
  return String(value).replace(/^[./]+/, "");
}

export function fail(message) {
  throw new Error(`Types pack verification failed: ${message}`);
}

export function parsePackJson(output) {
  const jsonMatch = output.match(/(\[\s*\{[\s\S]*\}\s*\])\s*$/);
  if (!jsonMatch) {
    fail("unable to parse `npm pack --dry-run --json` output");
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch {
    fail("unable to parse JSON payload from `npm pack --dry-run --json` output");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail("pack metadata is empty");
  }

  return parsed[0];
}

export function extractPackFilePaths(packResult) {
  const files = Array.isArray(packResult?.files)
    ? packResult.files.map((entry) => entry.path).filter(Boolean)
    : [];

  if (files.length === 0) {
    fail("tarball file list is empty");
  }

  return files;
}

export function getTypeEntryPaths(pkgJson) {
  const rootTypes = pkgJson?.types;
  const exportTypes = pkgJson?.exports?.["."]?.types;

  if (typeof rootTypes !== "string" || rootTypes.trim() === "") {
    fail('`package.json.types` must be a non-empty string');
  }

  if (typeof exportTypes !== "string" || exportTypes.trim() === "") {
    fail('`package.json.exports["."].types` must be a non-empty string');
  }

  return {
    rootTypes: normalizeRelativePath(rootTypes),
    exportTypes: normalizeRelativePath(exportTypes),
  };
}

export function verifyDeclaredTypePathsExist(pkgJson, projectRoot = process.cwd()) {
  const { rootTypes, exportTypes } = getTypeEntryPaths(pkgJson);

  const rootTypesAbsPath = path.resolve(projectRoot, rootTypes);
  const exportTypesAbsPath = path.resolve(projectRoot, exportTypes);

  if (!fs.existsSync(rootTypesAbsPath)) {
    fail(`declared types file does not exist: ${rootTypes}`);
  }

  if (!fs.existsSync(exportTypesAbsPath)) {
    fail(`declared export types file does not exist: ${exportTypes}`);
  }
}

export function verifyTypeArtifactsExist(projectRoot = process.cwd()) {
  const requiredTypeIndex = path.resolve(projectRoot, "dist/@types/index.d.ts");
  if (!fs.existsSync(requiredTypeIndex)) {
    fail("required declaration file is missing: dist/@types/index.d.ts");
  }

  const typesRoot = path.resolve(projectRoot, "dist/@types");
  const stack = [typesRoot];
  let declarationFileCount = 0;

  while (stack.length > 0) {
    const dirPath = stack.pop();
    if (!dirPath || !fs.existsSync(dirPath)) {
      continue;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".d.ts")) {
        declarationFileCount += 1;
      }
    }
  }

  if (declarationFileCount === 0) {
    fail("no declaration files found under dist/@types");
  }
}

export function verifyPackFileList(files) {
  if (!files.includes("dist/fdo-sdk.bundle.js")) {
    fail("tarball is missing dist/fdo-sdk.bundle.js");
  }

  if (!files.includes("dist/@types/index.d.ts")) {
    fail("tarball is missing dist/@types/index.d.ts");
  }

  const dtsFiles = files.filter((file) => file.endsWith(".d.ts"));
  if (dtsFiles.length === 0) {
    fail("tarball does not include any declaration files (*.d.ts)");
  }

  if (!files.some((file) => file.startsWith("dist/@types/"))) {
    fail("tarball does not include declaration files under dist/@types/");
  }

  if (!files.some((file) => file.startsWith("docs/"))) {
    fail("tarball does not include documentation files under docs/");
  }

  const forbiddenPrefixes = ["src/", "tests/", ".github/", "coverage/"];
  const forbiddenFiles = files.filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbiddenFiles.length > 0) {
    fail(`tarball includes development-only files: ${forbiddenFiles.join(", ")}`);
  }
}

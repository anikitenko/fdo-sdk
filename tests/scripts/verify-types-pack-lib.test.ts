import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractPackFilePaths,
  getTypeEntryPaths,
  parsePackJson,
  verifyDeclaredTypePathsExist,
  verifyPackFileList,
  verifyTypeArtifactsExist,
} from "../../scripts/lib/verify-types-pack-lib.mjs";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fdo-sdk-verify-types-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("verify-types-pack-lib", () => {
  it("parses npm pack output and extracts file list", () => {
    const output = JSON.stringify([
      {
        name: "@anikitenko/fdo-sdk",
        version: "1.1.1",
        files: [{ path: "dist/fdo-sdk.bundle.js" }, { path: "dist/@types/index.d.ts" }],
      },
    ]);

    const parsed = parsePackJson(output);
    const files = extractPackFilePaths(parsed);

    expect(files).toEqual(["dist/fdo-sdk.bundle.js", "dist/@types/index.d.ts"]);
  });

  it("accepts valid package type entry configuration", () => {
    const entries = getTypeEntryPaths({
      types: "dist/@types/index.d.ts",
      exports: {
        ".": {
          types: "./dist/@types/index.d.ts",
        },
      },
    });

    expect(entries.rootTypes).toBe("dist/@types/index.d.ts");
    expect(entries.exportTypes).toBe("dist/@types/index.d.ts");
  });

  it("fails when package type entry configuration is invalid", () => {
    expect(() => getTypeEntryPaths({ types: "" })).toThrowError(
      "Types pack verification failed: `package.json.types` must be a non-empty string"
    );
  });

  it("fails when declarations are missing from pack file list", () => {
    expect(() =>
      verifyPackFileList(["dist/fdo-sdk.bundle.js", "dist/dom-metadata.json", "docs/README.md"])
    ).toThrowError("Types pack verification failed: tarball is missing dist/@types/index.d.ts");
  });

  it("fails when declared package types path does not exist", () => {
    const root = createTempDir();
    const pkg = {
      types: "dist/@types/index.d.ts",
      exports: {
        ".": {
          types: "./dist/@types/index.d.ts",
        },
      },
    };

    expect(() => verifyDeclaredTypePathsExist(pkg, root)).toThrowError(
      "Types pack verification failed: declared types file does not exist: dist/@types/index.d.ts"
    );
  });

  it("passes when local declaration artifacts are present", () => {
    const root = createTempDir();
    const typesDir = path.join(root, "dist", "@types", "utils");
    fs.mkdirSync(typesDir, { recursive: true });
    fs.writeFileSync(path.join(root, "dist", "@types", "index.d.ts"), "export * from './utils/a';\n", "utf8");
    fs.writeFileSync(path.join(typesDir, "a.d.ts"), "export type A = string;\n", "utf8");

    expect(() => verifyTypeArtifactsExist(root)).not.toThrow();
  });

  it("fails when local declaration index is missing", () => {
    const root = createTempDir();
    fs.mkdirSync(path.join(root, "dist", "@types"), { recursive: true });
    fs.writeFileSync(path.join(root, "dist", "@types", "other.d.ts"), "export {};\n", "utf8");

    expect(() => verifyTypeArtifactsExist(root)).toThrowError(
      "Types pack verification failed: required declaration file is missing: dist/@types/index.d.ts"
    );
  });
});

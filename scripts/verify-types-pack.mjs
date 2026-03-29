import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  extractPackFilePaths,
  parsePackJson,
  verifyDeclaredTypePathsExist,
  verifyPackFileList,
  verifyTypeArtifactsExist,
} from "./lib/verify-types-pack-lib.mjs";

const localCachePath = path.resolve(".npm-cache-pack");
const env = {
  ...process.env,
  npm_config_cache: localCachePath,
  NPM_CONFIG_CACHE: localCachePath,
};

const packageJsonPath = path.resolve("package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

verifyDeclaredTypePathsExist(packageJson);
verifyTypeArtifactsExist();

const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", localCachePath], {
  encoding: "utf8",
  env,
  stdio: ["ignore", "pipe", "inherit"],
});

const packResult = parsePackJson(output);
const files = extractPackFilePaths(packResult);
verifyPackFileList(files);

console.log(`Verified type artifacts and npm pack dry-run for ${packResult.name}@${packResult.version}.`);
console.log(`Pack file count: ${files.length}`);
console.log(
  `Type declarations in pack: ${files.filter((file) => file.startsWith("dist/@types/") && file.endsWith(".d.ts")).length}`
);

import { execFileSync } from "node:child_process";
import path from "node:path";

function fail(message) {
  throw new Error(`Release package verification failed: ${message}`);
}

const localCachePath = path.resolve(".npm-cache-pack");
const env = {
  ...process.env,
  npm_config_cache: localCachePath,
  NPM_CONFIG_CACHE: localCachePath,
};

const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--cache", localCachePath], {
  encoding: "utf8",
  env,
  stdio: ["ignore", "pipe", "inherit"],
});

const jsonMatch = output.match(/(\[\s*\{[\s\S]*\}\s*\])\s*$/);
if (!jsonMatch) {
  fail("unable to parse `npm pack --dry-run --json` output");
}

const parsed = JSON.parse(jsonMatch[1]);
if (!Array.isArray(parsed) || parsed.length === 0) {
  fail("pack metadata is empty");
}

const packResult = parsed[0];
const files = Array.isArray(packResult.files) ? packResult.files.map((entry) => entry.path) : [];

if (files.length === 0) {
  fail("tarball file list is empty");
}

if (!files.some((file) => file.startsWith("dist/"))) {
  fail("tarball does not include any files under dist/");
}

if (!files.includes("dist/fdo-sdk.bundle.js")) {
  fail("tarball is missing dist/fdo-sdk.bundle.js");
}

const forbiddenPrefixes = ["src/", "tests/", ".github/", "coverage/"];
const forbiddenFiles = files.filter((file) => forbiddenPrefixes.some((prefix) => file.startsWith(prefix)));
if (forbiddenFiles.length > 0) {
  fail(`tarball includes development-only files: ${forbiddenFiles.join(", ")}`);
}

console.log(
  `Verified npm pack dry-run for ${packResult.name}@${packResult.version} with ${files.length} files.`
);

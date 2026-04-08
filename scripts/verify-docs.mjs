import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["README.md", "docs", "examples"];
const bannedPatterns = [
  { pattern: /docs-local\//g, message: "references local-only docs-local content" },
  { pattern: /PRODUCTION_GRADE_TODO\.md/g, message: "references removed internal production TODO" },
  { pattern: /REVOLUTIONARY_PLUGIN_SYSTEM_TODO\.md/g, message: "references internal roadmap TODO" },
  { pattern: /PHASE_1_FDO_ALIGNMENT_PROMPT\.md/g, message: "references internal FDO handoff prompt" },
  { pattern: /PHASE_2_FDO_ALIGNMENT_PROMPT\.md/g, message: "references internal FDO handoff prompt" },
  { pattern: /plugins\.fdo\.alexvwan\.me/g, message: "references stale docs domain" },
];

const markdownLinkPattern = /\[[^\]]+]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;
const findings = [];

async function walk(target) {
  const fullPath = path.join(repoRoot, target);
  const info = await stat(fullPath);
  if (info.isDirectory()) {
    const entries = await readdir(fullPath, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "docs-local") {
        continue;
      }
      results.push(...(await walk(path.join(target, entry.name))));
    }
    return results;
  }
  return [target];
}

function resolveMarkdownTarget(fromFile, target) {
  const cleanTarget = target.split("#")[0];
  if (!cleanTarget) {
    return null;
  }
  return path.resolve(path.dirname(path.join(repoRoot, fromFile)), cleanTarget);
}

for (const root of scanRoots) {
  const files = await walk(root);
  for (const relativeFile of files) {
    if (!/\.(md|ts|json)$/u.test(relativeFile)) {
      continue;
    }
    const fullPath = path.join(repoRoot, relativeFile);
    const content = await readFile(fullPath, "utf8");

    for (const { pattern, message } of bannedPatterns) {
      if (pattern.test(content)) {
        findings.push(`${relativeFile}: ${message}`);
      }
      pattern.lastIndex = 0;
    }

    if (relativeFile.endsWith(".md")) {
      for (const match of content.matchAll(markdownLinkPattern)) {
        const target = match[1];
        const resolved = resolveMarkdownTarget(relativeFile, target);
        if (!resolved) {
          continue;
        }
        try {
          await stat(resolved);
        } catch {
          findings.push(`${relativeFile}: broken relative markdown link -> ${target}`);
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Documentation verification failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Documentation verification passed.");

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

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
const codeFencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
const findings = [];
let verifiedSnippetCount = 0;
let runtimeCheckedSnippetCount = 0;

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

function getLineNumber(content, index) {
  const prefix = content.slice(0, index);
  return prefix.split("\n").length;
}

function parseFenceInfo(infoRaw) {
  const info = String(infoRaw || "").trim().toLowerCase();
  if (!info) {
    return { language: "", tags: new Set() };
  }

  const parts = info.split(/\s+/).filter(Boolean);
  const [language = ""] = parts;
  return {
    language,
    tags: new Set(parts.slice(1)),
  };
}

function mapLanguageToExtension(language) {
  if (language === "ts" || language === "typescript") {
    return "ts";
  }
  if (language === "js" || language === "javascript") {
    return "js";
  }
  return null;
}

function formatTsDiagnostics(diagnostics) {
  return diagnostics
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    .join(" | ");
}

function transpileSnippetOrThrow({ relativeFile, snippetIndex, language, source }) {
  const ext = mapLanguageToExtension(language);
  if (!ext) {
    throw new Error(
      `Snippet #${snippetIndex} in ${relativeFile} uses unsupported language "${language}" for docs verification.`
    );
  }

  const result = ts.transpileModule(source, {
    fileName: `${relativeFile}#snippet-${snippetIndex}.${ext}`,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      skipLibCheck: true,
      lib: ["lib.es2020.d.ts", "lib.dom.d.ts"],
    },
  });

  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw new Error(formatTsDiagnostics(errors));
  }

  return result.outputText;
}

function stripStaticImportsForRuntime(source) {
  return source
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "")
    .replace(/^\s*export\s+/gm, "");
}

async function runRuntimeSnippetOrThrow({ source }) {
  const runtimeSource = stripStaticImportsForRuntime(source);
  if (/\bimport\s/u.test(runtimeSource) || /\bexport\s/u.test(runtimeSource)) {
    throw new Error("runtime-check snippets must not contain unresolved import/export statements.");
  }

  const runtimeTranspile = ts.transpileModule(runtimeSource, {
    fileName: "docs-runtime-check.ts",
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      strict: false,
      skipLibCheck: true,
      lib: ["lib.es2020.d.ts", "lib.dom.d.ts"],
    },
  });
  const runtimeErrors = (runtimeTranspile.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (runtimeErrors.length > 0) {
    throw new Error(formatTsDiagnostics(runtimeErrors));
  }

  const context = vm.createContext({
    console: {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    window: {
      createBackendReq: async () => ({ ok: true }),
      waitForElement: () => {},
      addGlobalEventListener: () => {},
      removeGlobalEventListener: () => {},
      executeInjectedScript: () => {},
      applyClassToSelector: () => {},
    },
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ addEventListener: () => {}, dataset: {} }),
    },
    setTimeout,
    clearTimeout,
    Promise,
    Error,
  });

  const script = new vm.Script(runtimeTranspile.outputText);
  const result = script.runInContext(context, { timeout: 1500 });
  if (result && typeof result.then === "function") {
    await Promise.race([
      result,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("runtime-check snippet timed out.")), 1500);
      }),
    ]);
  }
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

      let snippetIndex = 0;
      for (const match of content.matchAll(codeFencePattern)) {
        snippetIndex += 1;
        const infoRaw = match[1] ?? "";
        const source = match[2] ?? "";
        const startIndex = match.index ?? 0;
        const line = getLineNumber(content, startIndex);
        const { language, tags } = parseFenceInfo(infoRaw);

        if (!tags.has("verify")) {
          continue;
        }

        verifiedSnippetCount += 1;
        try {
          transpileSnippetOrThrow({
            relativeFile,
            snippetIndex,
            language,
            source,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          findings.push(`${relativeFile}:${line} snippet #${snippetIndex} compile check failed: ${message}`);
          continue;
        }

        if (tags.has("runtime")) {
          runtimeCheckedSnippetCount += 1;
          try {
            await runRuntimeSnippetOrThrow({ source });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            findings.push(`${relativeFile}:${line} snippet #${snippetIndex} runtime check failed: ${message}`);
          }
        }
      }
    }
  }
}

if (verifiedSnippetCount === 0) {
  findings.push("No documentation snippets are tagged with `verify`. Add at least one fenced code block with `verify` tag.");
}

if (findings.length > 0) {
  console.error("Documentation verification failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(
  `Documentation verification passed. Verified snippets: ${verifiedSnippetCount}; runtime-checked snippets: ${runtimeCheckedSnippetCount}.`
);

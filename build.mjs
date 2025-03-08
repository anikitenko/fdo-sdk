import * as esbuild from "esbuild";

esbuild.build({
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    bundle: true,
    format: "esm",
    minify: true,
    treeShaking: true,
    platform: "node",
    sourcesContent: true,
    sourcemap:  true,
    jsx: "automatic",
    tsconfig: "./tsconfig.json",
    allowOverwrite: true,
})

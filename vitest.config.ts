import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup-vitest.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/**/*.{ts,js}"],
      exclude: ["src/**/*.d.ts", "src/**/index.{ts,js}"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    alias: {
      electron: path.resolve(__dirname, "tests/mocks/electron.ts"),
    },
  },
});

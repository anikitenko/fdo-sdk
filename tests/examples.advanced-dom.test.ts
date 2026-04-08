import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("@anikitenko/fdo-sdk", async () => {
    return await import("../src/index");
});

let AdvancedDOMPlugin: typeof import("../examples/05-advanced-dom-plugin").default;

beforeAll(async () => {
    (global as any).process.parentPort = {
        on: vi.fn(),
        postMessage: vi.fn(),
    };

    AdvancedDOMPlugin = (await import("../examples/05-advanced-dom-plugin")).default;
});

describe("Advanced DOM example", () => {
    test("renders without throwing", () => {
        const plugin = new AdvancedDOMPlugin();

        expect(() => plugin.render()).not.toThrow();
        expect(plugin.render()).toContain("Advanced DOM Example");
    });
});

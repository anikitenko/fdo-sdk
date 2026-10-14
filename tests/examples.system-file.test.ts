import { beforeAll, describe, expect, test, vi } from "vitest";
import vm from "node:vm";

let SystemFilePlugin: typeof import("../examples/10-system-file-plugin").default;

beforeAll(async () => {
    (global as any).process.parentPort = {
        on: vi.fn(),
        postMessage: vi.fn(),
    };

    SystemFilePlugin = (await import("../examples/10-system-file-plugin")).default;
});

describe("System file example", () => {
    test("renderOnLoad extracts request payload from privileged envelope", () => {
        const plugin = new SystemFilePlugin();
        const onLoad = plugin.renderOnLoad();

        expect(onLoad).toContain("envelopeResponse?.result?.request ?? envelopeResponse?.request ?? envelopeResponse");
        expect(onLoad).not.toContain('createBackendReq("requestPrivilegedAction", envelope)');
    });

    test.each(["wrapped", "envelope", "direct"])("frontend sends the %s request without backend imports", async (shape) => {
        const request = { action: "system.fs.mutate", payload: { scope: "etc-motd", operations: [] } };
        const envelope = { request, correlationId: "fixture" };
        const response = shape === "wrapped" ? { result: envelope } : shape === "envelope" ? envelope : request;
        const backend = vi.fn()
            .mockResolvedValueOnce(response)
            .mockResolvedValueOnce({ ok: true, correlationId: "fixture", result: { dryRun: true } });
        let click: (() => Promise<void>) | undefined;
        const output = { textContent: "" };
        const button = { addEventListener: (_event: string, handler: () => Promise<void>) => { click = handler; } };
        const context = vm.createContext({
            document: { getElementById: (id: string) => id === "run-system-file-action" ? button : output },
            window: { createBackendReq: backend },
        });
        vm.runInContext(new SystemFilePlugin().renderOnLoad(), context);
        expect(click).toBeTypeOf("function");
        await click!();
        expect(backend).toHaveBeenNthCalledWith(2, "requestPrivilegedAction", request);
        expect(JSON.parse(output.textContent)).toMatchObject({ status: "ok", correlationId: "fixture" });
    });
});

import {
    createFilesystemMutateActionRequest,
    FDOInterface,
    FDO_SDK,
    isPrivilegedActionSuccessResponse,
    requestPrivilegedAction,
} from "../src";

export class PrivilegedActionsPlugin extends FDO_SDK implements FDOInterface {
    get metadata() {
        return {
            name: "PrivilegedActionsPlugin",
            version: "1.0.0",
            author: "FDO Team",
            description: "Demonstrates the low-level host privileged action request flow with correlation IDs.",
            icon: "shield",
        };
    }

    init(): void {
        // Host handler name is host-defined. Keep it stable and document it in host integration docs.
        this.log("PrivilegedActionsPlugin initialized");
    }

    render(): string {
        return `<div style="padding: 16px;">
            <h2>Privileged Actions Demo</h2>
            <p>This file demonstrates the low-level transport helper path.</p>
            <p>Prefer curated operator fixtures and <code>requestOperatorTool(...)</code> first when a known tool family fits.</p>
            <p>Click to request a dry-run scoped filesystem mutation in host runtime.</p>
            <button id="run-privileged-action">Run Dry-Run</button>
            <pre id="result-box"></pre>
        </div>`;
    }

    renderOnLoad(): string {
        const request = createFilesystemMutateActionRequest({
            action: "system.fs.mutate",
            payload: {
                scope: "etc-hosts",
                dryRun: true,
                reason: "preview managed hosts block update",
                operations: [
                    {
                        type: "writeFile",
                        path: "/etc/hosts",
                        content: "# managed by fdo plugin",
                        encoding: "utf8",
                    },
                ],
            },
        });

        return `
            () => {
                const btn = document.getElementById("run-privileged-action");
                const resultBox = document.getElementById("result-box");
                if (!btn || !resultBox) return;

                btn.addEventListener("click", async () => {
                    let correlationId = "unknown";
                    try {
                        const response = await (${requestPrivilegedAction.toString()})(${JSON.stringify(request)}, {
                            correlationIdPrefix: "etc-hosts",
                        });
                        correlationId = response.correlationId;

                        if (${isPrivilegedActionSuccessResponse.toString()}(response)) {
                            resultBox.textContent = JSON.stringify({
                                status: "ok",
                                correlationId: response.correlationId,
                                result: response.result ?? null,
                            }, null, 2);
                            return;
                        }

                        resultBox.textContent = JSON.stringify({
                            status: "error",
                            correlationId: response?.correlationId ?? correlationId,
                            error: response?.error ?? "Unknown host error",
                            code: response?.code ?? "UNKNOWN",
                        }, null, 2);
                    } catch (error) {
                        resultBox.textContent = JSON.stringify({
                            status: "error",
                            correlationId,
                            error: error instanceof Error ? error.message : String(error),
                            code: "IPC_FAILURE",
                        }, null, 2);
                    }
                });
            }
        `;
    }
}

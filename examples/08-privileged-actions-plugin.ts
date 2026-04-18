import {
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createPrivilegedActionBackendRequest,
    extractPrivilegedActionRequest,
    FDOInterface,
    FDO_SDK,
    getInlinePrivilegedActionErrorFormatterSource,
    PluginCapability,
    PluginRegistry,
    PluginMetadata,
} from "@anikitenko/fdo-sdk";

export class PrivilegedActionsPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "PrivilegedActionsPlugin",
        version: "1.0.0",
        author: "FDO Team",
        description: "Demonstrates the low-level host privileged action request flow with correlation IDs.",
        icon: "shield",
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return [
            "system.hosts.write",
            createFilesystemScopeCapability("etc-hosts"),
        ];
    }

    init(): void {
        this.log("PrivilegedActionsPlugin initialized");

        PluginRegistry.registerHandler("privileged.buildDryRunRequest", async () => {
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

            return createPrivilegedActionBackendRequest(request, {
                correlationIdPrefix: "etc-hosts",
            });
        });
    }

    render(): string {
        return `
            <div style="padding: 16px;">
                <h2>Privileged Actions Demo</h2>
                <p>This example teaches the low-level host privileged action path.</p>
                <p>Prefer curated operator fixtures and <code>requestOperatorTool(...)</code> first when a known tool family fits.</p>
                <p>This example intentionally stays low-level: backend code builds a validated privileged-action envelope, and the iframe sends that envelope to the host privileged-action handler.</p>
                <p>Declared capabilities: <code>system.hosts.write</code> and <code>system.fs.scope.etc-hosts</code>.</p>
                <button id="run-privileged-action" class="pure-button pure-button-primary">Run Dry-Run</button>
                <pre id="result-box" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 120px;">Result will appear here...</pre>
            </div>
        `;
    }

    renderOnLoad(): string {
        const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
        return `
            (() => {
                const button = document.getElementById("run-privileged-action");
                const resultBox = document.getElementById("result-box");
                const formatPrivilegedActionError = ${formatPrivilegedActionErrorSource};

                if (!button || !resultBox) {
                    return;
                }

                const setResult = (value) => {
                    resultBox.textContent = typeof value === "string"
                        ? value
                        : JSON.stringify(value, null, 2);
                };

                button.addEventListener("click", async () => {
                    setResult("Building privileged-action envelope...");

                    try {
                        const envelope = await window.createBackendReq("UI_MESSAGE", {
                            handler: "privileged.buildDryRunRequest",
                            content: {},
                        });

                        const typedEnvelope = envelope;
                        const requestPayload = extractPrivilegedActionRequest(typedEnvelope);
                        const response = await window.createBackendReq("requestPrivilegedAction", requestPayload);

                        if (response && response.ok) {
                            setResult({
                                status: "ok",
                                correlationId: response.correlationId,
                                result: response.result ?? null,
                            });
                            return;
                        }

                        const fallbackCorrelationId = typedEnvelope?.result?.correlationId
                            ?? typedEnvelope?.correlationId
                            ?? "unknown";
                        setResult({
                            status: "error",
                            correlationId: response?.correlationId ?? fallbackCorrelationId,
                            error: formatPrivilegedActionError(response, {
                                context: "Privileged action failed",
                                fallbackCorrelationId,
                            }),
                            code: response?.code ?? "UNKNOWN",
                        });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        setResult({
                            status: "error",
                            error: message,
                            code: "IPC_FAILURE",
                        });
                    }
                });
            })();
        `;
    }
}

new PrivilegedActionsPlugin();

import {
    createFilesystemMutateActionRequest,
    createFilesystemScopeCapability,
    createPrivilegedActionBackendRequest,
    extractPrivilegedActionRequest,
    FDOInterface,
    FDO_SDK,
    getInlinePrivilegedActionErrorFormatterSource,
    PluginCapability,
    PluginMetadata,
    PluginRegistry,
} from "@anikitenko/fdo-sdk";

/**
 * Learning example 10: generic system file mutation.
 *
 * Why this exists:
 * - 08 teaches the low-level privileged transport path using /etc/hosts
 * - this example is the next logical move for a developer who needs a different system file
 * - it demonstrates the generic system.fs.mutate contract with a narrow filesystem scope
 *
 * This example uses /etc/motd as a simple text-file target and keeps the action in dry-run mode.
 */
export default class SystemFilePlugin extends FDO_SDK implements FDOInterface {
    private static readonly HANDLER = "systemFile.v1.buildMotdDryRunRequest";

    private readonly _metadata: PluginMetadata = {
        name: "SystemFilePlugin",
        version: "1.0.0",
        author: "FDO Team",
        description: "Demonstrates low-level scoped filesystem mutation for a system file other than /etc/hosts.",
        icon: "document-share",
    };

    private readonly scopeId = "etc-motd";

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return [
            "system.hosts.write",
            createFilesystemScopeCapability(this.scopeId),
        ];
    }

    init(): void {
        this.info("System file plugin initialized", {
            declaredCapabilities: this.declareCapabilities(),
            scopeId: this.scopeId,
            handler: SystemFilePlugin.HANDLER,
        });

        PluginRegistry.registerHandler(SystemFilePlugin.HANDLER, async () => {
            const request = createFilesystemMutateActionRequest({
                action: "system.fs.mutate",
                payload: {
                    scope: this.scopeId,
                    dryRun: true,
                    reason: "preview managed motd banner update",
                    operations: [
                        {
                            type: "appendFile",
                            path: "/etc/motd",
                            content: "\nManaged by FDO SDK example plugin\n",
                            encoding: "utf8",
                        },
                    ],
                },
            });

            return createPrivilegedActionBackendRequest(request, {
                correlationIdPrefix: "etc-motd",
            });
        });
    }

    render(): string {
        return `
            <div style="padding: 16px;">
                <h2>Generic System File Mutation Demo</h2>
                <p>This example is the next logical step after <code>08-privileged-actions-plugin.ts</code>.</p>
                <p>It teaches the same low-level privileged transport path, but uses the generic <code>system.fs.mutate</code> contract for a different scoped system file.</p>
                <p>Target file: <code>/etc/motd</code>. Scope: <code>system.fs.scope.etc-motd</code>.</p>
                <p>Backend code builds the validated privileged-action envelope, and the iframe sends that envelope to the host privileged-action handler.</p>
                <button id="run-system-file-action" class="pure-button pure-button-primary" type="button">Preview MOTD Update</button>
                <pre id="system-file-result" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 120px;">Result will appear here...</pre>
            </div>
        `;
    }

    renderOnLoad(): string {
        const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
        return `
            (() => {
                const button = document.getElementById("run-system-file-action");
                const resultBox = document.getElementById("system-file-result");
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
                        const envelopeResponse = await window.createBackendReq("UI_MESSAGE", {
                            handler: "${SystemFilePlugin.HANDLER}",
                            content: {},
                        });

                        const requestPayload = extractPrivilegedActionRequest(envelopeResponse);
                        const envelopeCorrelationId = envelopeResponse?.result?.correlationId ?? envelopeResponse?.correlationId ?? "unknown";

                        if (!requestPayload || typeof requestPayload !== "object") {
                            setResult({
                                status: "error",
                                correlationId: envelopeCorrelationId,
                                error: "Backend handler did not return a privileged request envelope.",
                                code: "PLUGIN_BACKEND_EMPTY_RESPONSE",
                            });
                            return;
                        }

                        const response = await window.createBackendReq("requestPrivilegedAction", requestPayload);

                        if (response && response.ok) {
                            setResult({
                                status: "ok",
                                correlationId: response.correlationId,
                                result: response.result ?? null,
                            });
                            return;
                        }

                        setResult({
                            status: "error",
                            correlationId: response?.correlationId ?? envelopeCorrelationId,
                            error: formatPrivilegedActionError(response, {
                                context: "System file action failed",
                                fallbackCorrelationId: envelopeCorrelationId,
                            }),
                            code: response?.code ?? "UNKNOWN",
                        });
                    } catch (error) {
                        setResult({
                            status: "error",
                            error: error instanceof Error ? error.message : String(error),
                            code: "IPC_FAILURE",
                        });
                    }
                });
            })();
        `;
    }
}

new SystemFilePlugin();

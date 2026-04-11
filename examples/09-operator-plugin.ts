import {
    createOperatorToolActionRequest,
    createOperatorToolCapabilityPreset,
    createPrivilegedActionBackendRequest,
    FDOInterface,
    FDO_SDK,
    getOperatorToolPreset,
    PluginCapability,
    PluginMetadata,
    PluginRegistry,
} from "@anikitenko/fdo-sdk";

export default class OperatorPluginExample extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "Operator Plugin Example",
        version: "1.0.0",
        author: "FDO SDK",
        description: "Demonstrates the curated operator helper path for a known tool family.",
        icon: "console",
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return createOperatorToolCapabilityPreset("docker-cli");
    }

    init(): void {
        this.info("Operator plugin example initialized", {
            logDirectory: this.getLogDirectory(),
            preset: getOperatorToolPreset("docker-cli"),
            requestedCapabilities: createOperatorToolCapabilityPreset("docker-cli"),
        });

        PluginRegistry.registerHandler("operator.buildDockerStatusRequest", async () => {
            const request = createOperatorToolActionRequest("docker-cli", {
                command: "/usr/local/bin/docker",
                args: ["ps", "--format", "json"],
                timeoutMs: 5000,
                dryRun: true,
                reason: "preview running containers for dashboard",
            });

            return createPrivilegedActionBackendRequest(request, {
                correlationIdPrefix: "docker-cli",
            });
        });
    }

    render(): string {
        return `
            <div style="padding: 16px;">
                <h2>Operator Plugin Example</h2>
                <p>This example teaches the curated operator helper path for a known tool family.</p>
                <p>Declared capabilities: broad host tool execution plus the narrow Docker CLI scope.</p>
                <p>Preferred request builder: <code>createOperatorToolActionRequest("docker-cli", ...)</code></p>
                <p>Preferred runtime path: backend builds the curated operator request, iframe sends the envelope to the host privileged-action handler.</p>
                <button id="run-docker-status" class="pure-button pure-button-primary">Dry-Run Docker Status</button>
                <pre id="operator-result-box" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 120px;">Result will appear here...</pre>
            </div>
        `;
    }

    renderOnLoad(): string {
        return `
            (() => {
                const button = document.getElementById("run-docker-status");
                const output = document.getElementById("operator-result-box");

                if (!button || !output) {
                    return;
                }

                const setOutput = (value) => {
                    output.textContent = typeof value === "string"
                        ? value
                        : JSON.stringify(value, null, 2);
                };

                button.addEventListener("click", async () => {
                    setOutput("Building curated operator envelope...");

                    try {
                        const envelope = await window.createBackendReq("UI_MESSAGE", {
                            handler: "operator.buildDockerStatusRequest",
                            content: {},
                        });

                        const response = await window.createBackendReq("requestPrivilegedAction", envelope);

                        if (response && response.ok) {
                            setOutput({
                                status: "ok",
                                correlationId: response.correlationId,
                                result: response.result ?? null,
                            });
                            return;
                        }

                        setOutput({
                            status: "error",
                            correlationId: response?.correlationId ?? envelope?.correlationId ?? "unknown",
                            error: response?.error ?? "Unknown host error",
                            code: response?.code ?? "UNKNOWN",
                        });
                    } catch (error) {
                        setOutput({
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

new OperatorPluginExample();

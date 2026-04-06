import {
    createPrivilegedActionCorrelationId,
    createProcessExecActionRequest,
    FDOInterface,
    FDO_SDK,
    isPrivilegedActionErrorResponse,
    isPrivilegedActionSuccessResponse,
    PluginMetadata,
} from "../src";

export default class OperatorPluginExample extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "Operator Plugin Example",
        version: "1.0.0",
        author: "FDO SDK",
        description: "Demonstrates Docker/Kubernetes style operator flows through scoped host process execution.",
        icon: "console",
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.info("Operator plugin example initialized", { logDirectory: this.getLogDirectory() });
    }

    render(): string {
        return `
            <div style="padding: 16px;">
                <h2>Operator Plugin Example</h2>
                <p>This pattern is intended for Docker Desktop-like plugins, Kubernetes dashboards, and similar operator tooling.</p>
                <button id="run-docker-status">Dry-Run Docker Status</button>
                <pre id="operator-result-box"></pre>
            </div>
        `;
    }

    renderOnLoad(): string {
        const request = createProcessExecActionRequest({
            action: "system.process.exec",
            payload: {
                scope: "docker-cli",
                command: "/usr/local/bin/docker",
                args: ["ps", "--format", "json"],
                timeoutMs: 5000,
                dryRun: true,
                reason: "preview running containers for dashboard",
            },
        });

        return `
            () => {
                const button = document.getElementById("run-docker-status");
                const output = document.getElementById("operator-result-box");
                if (!button || !output) return;

                button.addEventListener("click", async () => {
                    const correlationId = (${createPrivilegedActionCorrelationId.toString()})("docker-cli");
                    try {
                        const response = await window.createBackendReq("requestPrivilegedAction", {
                            correlationId,
                            request: ${JSON.stringify(request)},
                        });

                        if (${isPrivilegedActionSuccessResponse.toString()}(response)) {
                            output.textContent = JSON.stringify({
                                status: "ok",
                                correlationId: response.correlationId,
                                result: response.result ?? null,
                            }, null, 2);
                            return;
                        }

                        if (${isPrivilegedActionErrorResponse.toString()}(response)) {
                            output.textContent = JSON.stringify({
                                status: "error",
                                correlationId: response.correlationId,
                                error: response.error,
                                code: response.code ?? "UNKNOWN",
                            }, null, 2);
                            return;
                        }

                        output.textContent = JSON.stringify({
                            status: "error",
                            correlationId,
                            error: "Invalid privileged action response envelope",
                            code: "INVALID_RESPONSE",
                        }, null, 2);
                    } catch (error) {
                        output.textContent = JSON.stringify({
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

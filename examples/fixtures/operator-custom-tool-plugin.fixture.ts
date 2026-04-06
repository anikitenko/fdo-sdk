import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
  createProcessCapabilityBundle,
  createScopedProcessExecActionRequest,
  requestScopedProcessExec,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Custom internal operator tool.
 * Pattern intent: generic scoped helper flow for host-specific tools that are not in the curated preset set.
 */
export default class OperatorCustomToolFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Custom Operator Tool",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for custom host-defined process scopes",
    icon: "flows",
  };

  private readonly scopeId = "internal-runner";

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    const request = createScopedProcessExecActionRequest(this.scopeId, {
      command: "/usr/local/bin/internal-runner",
      args: ["status"],
      timeoutMs: 3000,
      dryRun: true,
      reason: "preview internal runner status",
    });

    this.info("Custom operator fixture initialized", {
      scopeId: this.scopeId,
      requestedCapabilities: createProcessCapabilityBundle(this.scopeId),
      request,
    });
  }

  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Use generic scoped helpers when the tool family is host-specific.</p>
      </div>
    `;
  }

  async previewRunnerStatus(): Promise<unknown> {
    return requestScopedProcessExec(this.scopeId, {
      command: "/usr/local/bin/internal-runner",
      args: ["status"],
      timeoutMs: 3000,
      dryRun: true,
      reason: "preview internal runner status",
    });
  }
}

new OperatorCustomToolFixturePlugin();

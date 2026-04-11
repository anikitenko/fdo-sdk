import {
  FDOInterface,
  FDO_SDK,
  PluginCapability,
  PluginMetadata,
  PluginRegistry,
  createProcessCapabilityBundle,
  createPrivilegedActionBackendRequest,
  createScopedProcessExecActionRequest,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Custom internal operator tool.
 * Pattern intent: generic scoped helper flow for host-specific tools that are not in the curated preset set.
 *
 * Why this fixture exists:
 * - declares the narrow custom process scope up front
 * - builds a validated scoped-process envelope in backend code
 * - uses UI_MESSAGE from the iframe to fetch that envelope
 * - sends the envelope through the host privileged-action path
 */
export default class OperatorCustomToolFixturePlugin extends FDO_SDK implements FDOInterface {
  private static readonly HANDLERS = {
    PREVIEW_STATUS: "customToolFixture.v2.previewRunnerStatus",
  } as const;

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

  declareCapabilities(): PluginCapability[] {
    return createProcessCapabilityBundle(this.scopeId);
  }

  init(): void {
    this.info("Custom operator fixture initialized", {
      scopeId: this.scopeId,
      declaredCapabilities: this.declareCapabilities(),
      requestedCapabilities: createProcessCapabilityBundle(this.scopeId),
      handlers: OperatorCustomToolFixturePlugin.HANDLERS,
    });

    PluginRegistry.registerHandler(
      OperatorCustomToolFixturePlugin.HANDLERS.PREVIEW_STATUS,
      async () => this.buildPreviewRunnerStatusEnvelope()
    );
  }

  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this._metadata.name}</h1>
        <p><strong>Fixture handler version:</strong> <code>customToolFixture.v2.*</code></p>
        <p>Use generic scoped process execution when the tool family is host-specific and not covered by a curated operator preset.</p>
        <p>This fixture declares the broad execution capability plus the narrow <code>${this.scopeId}</code> process scope.</p>
        <p>Backend code builds the validated envelope. The iframe asks for that envelope through <code>UI_MESSAGE</code> and sends it to the host privileged-action handler.</p>
        <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
          <button id="custom-tool-preview-status" class="pure-button pure-button-primary" type="button">Preview Runner Status</button>
        </div>
        <pre id="custom-tool-result" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 140px;">Result will appear here...</pre>
      </div>
    `;
  }

  renderOnLoad(): string {
    return `
      (() => {
        const previewStatusButton = document.getElementById("custom-tool-preview-status");
        const output = document.getElementById("custom-tool-result");

        if (!previewStatusButton || !output) {
          return;
        }

        const setOutput = (value) => {
          output.textContent = typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2);
        };

        const runEnvelopeHandler = async (handler) => {
          setOutput("Building request envelope...");
          try {
            const envelope = await window.createBackendReq("UI_MESSAGE", {
              handler,
              content: {},
            });
            const response = await window.createBackendReq("requestPrivilegedAction", envelope);
            setOutput(response);
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        previewStatusButton.addEventListener("click", () => {
          void runEnvelopeHandler("${OperatorCustomToolFixturePlugin.HANDLERS.PREVIEW_STATUS}");
        });
      })();
    `;
  }

  private buildPreviewRunnerStatusEnvelope() {
    const request = createScopedProcessExecActionRequest(this.scopeId, {
      command: "/usr/local/bin/internal-runner",
      args: ["status"],
      timeoutMs: 3000,
      dryRun: true,
      reason: "preview internal runner status",
    });

    return createPrivilegedActionBackendRequest(request, {
      correlationIdPrefix: "custom-tool",
    });
  }
}

new OperatorCustomToolFixturePlugin();

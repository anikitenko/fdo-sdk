import {
  createOperatorToolActionRequest,
  createOperatorToolCapabilityPreset,
  createPrivilegedActionBackendRequest,
  createScopedWorkflowRequest,
  FDOInterface,
  FDO_SDK,
  getOperatorToolPreset,
  PluginCapability,
  PluginMetadata,
  PluginRegistry,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Kubernetes operator console.
 * Pattern intent: curated operator preset for a known DevOps/SRE tool family.
 *
 * Why this fixture exists:
 * - declares the curated kubectl capability preset up front
 * - builds validated operator/workflow envelopes in backend code
 * - uses UI_MESSAGE from the iframe to fetch those envelopes
 * - sends the envelopes through the host privileged-action path
 */
export default class OperatorKubernetesFixturePlugin extends FDO_SDK implements FDOInterface {
  private static readonly HANDLERS = {
    PREVIEW_OBJECTS: "kubectlFixture.v2.previewClusterObjects",
    INSPECT_RESTART: "kubectlFixture.v2.inspectAndRestartWorkflow",
  } as const;

  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Kubernetes Operator",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for kubectl-based operator plugins",
    icon: "diagram-tree",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  declareCapabilities(): PluginCapability[] {
    return createOperatorToolCapabilityPreset("kubectl");
  }

  init(): void {
    const preset = getOperatorToolPreset("kubectl");
    this.info("Kubernetes operator fixture initialized", {
      preset,
      declaredCapabilities: this.declareCapabilities(),
      requestedCapabilities: createOperatorToolCapabilityPreset("kubectl"),
      handlers: OperatorKubernetesFixturePlugin.HANDLERS,
    });

    PluginRegistry.registerHandler(
      OperatorKubernetesFixturePlugin.HANDLERS.PREVIEW_OBJECTS,
      async () => this.buildPreviewObjectsEnvelope()
    );
    PluginRegistry.registerHandler(
      OperatorKubernetesFixturePlugin.HANDLERS.INSPECT_RESTART,
      async () => this.buildInspectRestartWorkflowEnvelope()
    );
  }

  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this.metadata.name}</h1>
        <p><strong>Fixture handler version:</strong> <code>kubectlFixture.v2.*</code></p>
        <p>Use curated operator presets for known tool families such as kubectl.</p>
        <p>Single-action preview uses a curated operator request. Inspect/act uses a scoped workflow request.</p>
        <p>Backend code builds the validated envelope. The iframe asks for that envelope through <code>UI_MESSAGE</code> and sends it to the host privileged-action handler.</p>
        <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
          <button id="kubectl-preview-objects" class="pure-button pure-button-primary" type="button">Inspect Objects</button>
          <button id="kubectl-inspect-restart-workflow" class="pure-button" type="button">Inspect + Restart Workflow</button>
        </div>
        <pre id="kubectl-workflow-result" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 140px;">Result will appear here...</pre>
      </div>
    `;
  }

  renderOnLoad(): string {
    return `
      (() => {
        const previewObjectsButton = document.getElementById("kubectl-preview-objects");
        const inspectRestartWorkflowButton = document.getElementById("kubectl-inspect-restart-workflow");
        const output = document.getElementById("kubectl-workflow-result");

        if (!previewObjectsButton || !inspectRestartWorkflowButton || !output) {
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

        previewObjectsButton.addEventListener("click", () => {
          void runEnvelopeHandler("${OperatorKubernetesFixturePlugin.HANDLERS.PREVIEW_OBJECTS}");
        });

        inspectRestartWorkflowButton.addEventListener("click", () => {
          void runEnvelopeHandler("${OperatorKubernetesFixturePlugin.HANDLERS.INSPECT_RESTART}");
        });
      })();
    `;
  }

  private buildPreviewObjectsEnvelope() {
    const request = createOperatorToolActionRequest("kubectl", {
      command: "/usr/local/bin/kubectl",
      args: ["get", "pods", "--all-namespaces", "-o", "json"],
      timeoutMs: 5000,
      dryRun: true,
      reason: "preview cluster workload inventory",
    });

    return createPrivilegedActionBackendRequest(request, {
      correlationIdPrefix: "kubectl",
    });
  }

  buildInspectActWorkflow() {
    return createScopedWorkflowRequest("kubectl", {
      kind: "process-sequence",
      title: "Inspect and restart deployment",
      summary: "Inspect deployment state before running a scoped rollout restart",
      dryRun: true,
      steps: [
        {
          id: "inspect-deployment",
          title: "Inspect deployment",
          phase: "inspect",
          command: "/usr/local/bin/kubectl",
          args: ["get", "deployment", "api", "-n", "default", "-o", "json"],
          timeoutMs: 5000,
          reason: "inspect deployment state before restart",
          onError: "abort",
        },
        {
          id: "restart-deployment",
          title: "Restart deployment",
          phase: "mutate",
          command: "/usr/local/bin/kubectl",
          args: ["rollout", "restart", "deployment/api", "-n", "default"],
          timeoutMs: 5000,
          reason: "restart deployment after inspection",
          onError: "abort",
        },
      ],
      confirmation: {
        message: "Restart deployment api in namespace default?",
        requiredForStepIds: ["restart-deployment"],
      },
    });
  }

  private buildInspectRestartWorkflowEnvelope() {
    return createPrivilegedActionBackendRequest(this.buildInspectActWorkflow(), {
      correlationIdPrefix: "kubectl",
    });
  }
}

new OperatorKubernetesFixturePlugin();

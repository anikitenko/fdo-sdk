import {
  createPrivilegedActionBackendRequest,
  extractPrivilegedActionRequest,
  FDOInterface,
  FDO_SDK,
  getInlinePrivilegedActionErrorFormatterSource,
  getOperatorToolPreset,
  PluginCapability,
  PluginMetadata,
  PluginRegistry,
  createOperatorToolActionRequest,
  createOperatorToolCapabilityPreset,
  createScopedWorkflowRequest,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Infrastructure plan console.
 * Pattern intent: curated operator preset for Terraform-style plan/apply workflows.
 *
 * Why this fixture exists:
 * - declares the curated terraform capability preset up front
 * - builds validated operator/workflow envelopes in backend code
 * - uses UI_MESSAGE from the iframe to fetch those envelopes
 * - sends the envelopes through the host privileged-action path
 */
export default class OperatorTerraformFixturePlugin extends FDO_SDK implements FDOInterface {
  private static readonly HANDLERS = {
    PREVIEW_PLAN: "terraformFixture.v2.previewPlan",
    PREVIEW_APPLY_WORKFLOW: "terraformFixture.v2.previewApplyWorkflow",
  } as const;

  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Terraform Operator",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for Terraform-style operator plugins",
    icon: "predictive-analysis",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  declareCapabilities(): PluginCapability[] {
    return createOperatorToolCapabilityPreset("terraform");
  }

  init(): void {
    const preset = getOperatorToolPreset("terraform");
    this.info("Terraform operator fixture initialized", {
      preset,
      declaredCapabilities: this.declareCapabilities(),
      requestedCapabilities: createOperatorToolCapabilityPreset("terraform"),
      handlers: OperatorTerraformFixturePlugin.HANDLERS,
    });

    PluginRegistry.registerHandler(
      OperatorTerraformFixturePlugin.HANDLERS.PREVIEW_PLAN,
      async () => this.buildPreviewPlanEnvelope()
    );
    PluginRegistry.registerHandler(
      OperatorTerraformFixturePlugin.HANDLERS.PREVIEW_APPLY_WORKFLOW,
      async () => this.buildPreviewApplyWorkflowEnvelope()
    );
  }

  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this._metadata.name}</h1>
        <p><strong>Fixture handler version:</strong> <code>terraformFixture.v2.*</code></p>
        <p>Use curated operator presets for known tool families such as Terraform.</p>
        <p>Single-action preview uses a curated operator request. Preview/apply uses a scoped workflow request.</p>
        <p>Backend code builds the validated envelope. The iframe asks for that envelope through <code>UI_MESSAGE</code> and sends it to the host privileged-action handler.</p>
        <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
          <button id="terraform-preview-plan" class="pure-button pure-button-primary" type="button">Preview Plan</button>
          <button id="terraform-preview-apply-workflow" class="pure-button" type="button">Preview + Apply Workflow</button>
        </div>
        <pre id="terraform-workflow-result" style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 140px;">Result will appear here...</pre>
      </div>
    `;
  }

  renderOnLoad(): string {
    const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
    return `
      (() => {
        const previewPlanButton = document.getElementById("terraform-preview-plan");
        const previewApplyWorkflowButton = document.getElementById("terraform-preview-apply-workflow");
        const output = document.getElementById("terraform-workflow-result");
        const formatPrivilegedActionError = ${formatPrivilegedActionErrorSource};
        if (!previewPlanButton || !previewApplyWorkflowButton || !output) {
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
            const fallbackCorrelationId = envelope?.result?.correlationId ?? envelope?.correlationId ?? "unknown";
            const requestPayload = extractPrivilegedActionRequest(envelope);
            const response = await window.createBackendReq("requestPrivilegedAction", requestPayload);
            if (response && response.ok) {
              setOutput(response);
              return;
            }
            setOutput({
              status: "error",
              correlationId: response?.correlationId ?? fallbackCorrelationId,
              message: formatPrivilegedActionError(response, {
                context: "Terraform operator request failed",
                fallbackCorrelationId,
              }),
              response: response ?? null,
            });
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        previewPlanButton.addEventListener("click", () => {
          void runEnvelopeHandler("${OperatorTerraformFixturePlugin.HANDLERS.PREVIEW_PLAN}");
        });

        previewApplyWorkflowButton.addEventListener("click", () => {
          void runEnvelopeHandler("${OperatorTerraformFixturePlugin.HANDLERS.PREVIEW_APPLY_WORKFLOW}");
        });
      })();
    `;
  }

  private buildPreviewPlanEnvelope() {
    const request = createOperatorToolActionRequest("terraform", {
      command: "/usr/local/bin/terraform",
      args: ["plan", "-input=false"],
      timeoutMs: 10000,
      dryRun: true,
      reason: "preview infrastructure plan",
    });

    return createPrivilegedActionBackendRequest(request, {
      correlationIdPrefix: "terraform",
    });
  }

  buildPreviewApplyWorkflow() {
    return createScopedWorkflowRequest("terraform", {
      kind: "process-sequence",
      title: "Terraform preview and apply",
      summary: "Preview infrastructure changes before apply",
      dryRun: true,
      steps: [
        {
          id: "plan",
          title: "Generate plan",
          phase: "preview",
          command: "/usr/local/bin/terraform",
          args: ["plan", "-input=false"],
          timeoutMs: 10000,
          reason: "preview infrastructure plan",
          onError: "abort",
        },
        {
          id: "apply",
          title: "Apply plan",
          phase: "apply",
          command: "/usr/local/bin/terraform",
          args: ["apply", "-input=false", "tfplan"],
          timeoutMs: 10000,
          reason: "apply approved infrastructure plan",
          onError: "abort",
        },
      ],
      confirmation: {
        message: "Apply infrastructure changes?",
        requiredForStepIds: ["apply"],
      },
    });
  }

  private buildPreviewApplyWorkflowEnvelope() {
    return createPrivilegedActionBackendRequest(this.buildPreviewApplyWorkflow(), {
      correlationIdPrefix: "terraform",
    });
  }
}

new OperatorTerraformFixturePlugin();

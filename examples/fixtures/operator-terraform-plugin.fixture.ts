import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
  PluginRegistry,
  createOperatorToolActionRequest,
  createOperatorToolCapabilityPreset,
  createScopedWorkflowRequest,
  requestOperatorTool,
  requestScopedWorkflow,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Infrastructure plan console.
 * Pattern intent: curated operator preset for Terraform-style plan/apply workflows.
 */
export default class OperatorTerraformFixturePlugin extends FDO_SDK implements FDOInterface {
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

  declareCapabilities() {
    return createOperatorToolCapabilityPreset("terraform");
  }

  init(): void {
    const request = createOperatorToolActionRequest("terraform", {
      command: "/usr/local/bin/terraform",
      args: ["plan", "-input=false"],
      timeoutMs: 10000,
      dryRun: true,
      reason: "preview infrastructure plan",
    });

    this.info("Terraform operator fixture initialized", {
      declaredCapabilities: this.declareCapabilities(),
      requestedCapabilities: createOperatorToolCapabilityPreset("terraform"),
      request,
    });

    PluginRegistry.registerHandler("terraform.previewPlan", async () => this.previewPlan());
    PluginRegistry.registerHandler("terraform.previewApplyWorkflow", async () => this.previewAndApplyWorkflow());
  }

  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Use curated capability and request helpers for known tool families.</p>
        <p>For multi-step preview/apply flows, prefer <code>requestScopedWorkflow(...)</code> over plugin-private orchestration.</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
          <button id="terraform-preview-plan">Preview Plan</button>
          <button id="terraform-preview-apply-workflow">Preview+Apply Workflow</button>
        </div>
        <pre id="terraform-workflow-result" style={{ marginTop: "16px", whiteSpace: "pre-wrap" }}></pre>
      </div>
    `;
  }

  renderOnLoad(): string {
    return `
      () => {
        const previewPlanButton = document.getElementById("terraform-preview-plan");
        const previewApplyWorkflowButton = document.getElementById("terraform-preview-apply-workflow");
        const output = document.getElementById("terraform-workflow-result");
        if (!previewPlanButton || !previewApplyWorkflowButton || !output) return;

        const runHandler = async (handler) => {
          output.textContent = "Running...";
          try {
            const result = await window.createBackendReq("UI_MESSAGE", {
              handler,
              content: {},
            });
            output.textContent = JSON.stringify(result, null, 2);
          } catch (error) {
            output.textContent = JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }, null, 2);
          }
        };

        previewPlanButton.addEventListener("click", () => {
          void runHandler("terraform.previewPlan");
        });

        previewApplyWorkflowButton.addEventListener("click", () => {
          void runHandler("terraform.previewApplyWorkflow");
        });
      }
    `;
  }

  async previewPlan(): Promise<unknown> {
    return requestOperatorTool("terraform", {
      command: "/usr/local/bin/terraform",
      args: ["plan", "-input=false"],
      timeoutMs: 10000,
      dryRun: true,
      reason: "preview infrastructure plan",
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

  async previewAndApplyWorkflow(): Promise<unknown> {
    return requestScopedWorkflow("terraform", {
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
}

new OperatorTerraformFixturePlugin();

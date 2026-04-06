import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
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

  init(): void {
    const request = createOperatorToolActionRequest("terraform", {
      command: "/usr/local/bin/terraform",
      args: ["plan", "-input=false"],
      timeoutMs: 10000,
      dryRun: true,
      reason: "preview infrastructure plan",
    });

    this.info("Terraform operator fixture initialized", {
      requestedCapabilities: createOperatorToolCapabilityPreset("terraform"),
      request,
    });
  }

  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Use curated capability and request helpers for known tool families.</p>
        <p>For multi-step preview/apply flows, prefer <code>requestScopedWorkflow(...)</code> over plugin-private orchestration.</p>
      </div>
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

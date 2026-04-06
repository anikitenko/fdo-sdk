import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
  createOperatorToolActionRequest,
  createOperatorToolCapabilityPreset,
  requestOperatorTool,
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
}

new OperatorTerraformFixturePlugin();

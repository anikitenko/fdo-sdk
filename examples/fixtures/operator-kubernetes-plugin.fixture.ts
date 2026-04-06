import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
  createOperatorToolCapabilityPreset,
  getOperatorToolPreset,
  requestOperatorTool,
} from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Kubernetes operator console.
 * Pattern intent: curated operator preset for a known DevOps/SRE tool family.
 */
export default class OperatorKubernetesFixturePlugin extends FDO_SDK implements FDOInterface {
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

  init(): void {
    const preset = getOperatorToolPreset("kubectl");
    this.info("Kubernetes operator fixture initialized", {
      preset,
      requestedCapabilities: createOperatorToolCapabilityPreset("kubectl"),
    });
  }

  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Recommended host capability bundle: ${JSON.stringify(createOperatorToolCapabilityPreset("kubectl"))}</p>
        <p>Preferred request helper: <code>requestOperatorTool("kubectl", ...)</code></p>
      </div>
    `;
  }

  async previewClusterObjects(): Promise<unknown> {
    return requestOperatorTool("kubectl", {
      command: "/usr/local/bin/kubectl",
      args: ["get", "pods", "--all-namespaces", "-o", "json"],
      timeoutMs: 5000,
      dryRun: true,
      reason: "preview cluster workload inventory",
    });
  }
}

new OperatorKubernetesFixturePlugin();

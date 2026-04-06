import {
  FDOInterface,
  FDO_SDK,
  PluginMetadata,
  createOperatorToolCapabilityPreset,
  getOperatorToolPreset,
  createScopedWorkflowRequest,
  requestOperatorTool,
  requestScopedWorkflow,
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
        <p>For inspect/act flows, prefer <code>requestScopedWorkflow(...)</code> over plugin-private orchestration.</p>
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

  async inspectAndRestartWorkflow(): Promise<unknown> {
    return requestScopedWorkflow("kubectl", {
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
}

new OperatorKubernetesFixturePlugin();

import {
    OperatorToolPresetDefinition,
    OperatorToolPresetId,
    PluginCapability,
    PrivilegedActionResponse,
    ProcessExecActionPayloadInput,
    ProcessExecActionRequest,
    RequestPrivilegedActionOptions,
} from "../types";
import { createProcessCapabilityBundle } from "./capabilities";
import { requestPrivilegedAction } from "./privilegedTransport";
import { createProcessExecActionRequest } from "./privilegedActions";

const PRESET_CONFIG: Record<OperatorToolPresetId, Omit<OperatorToolPresetDefinition, "capabilities">> = {
    "docker-cli": {
        id: "docker-cli",
        label: "Docker CLI",
        description: "Container lifecycle, image, and compose workflows through the host allowlisted Docker CLI policy.",
        scopeId: "docker-cli",
        suggestedCommands: ["docker", "docker compose"],
        typicalUseCases: ["Container dashboards", "Compose orchestration", "Image inspection"],
    },
    kubectl: {
        id: "kubectl",
        label: "kubectl",
        description: "Kubernetes cluster inspection and controlled mutation workflows through scoped kubectl execution.",
        scopeId: "kubectl",
        suggestedCommands: ["kubectl"],
        typicalUseCases: ["Cluster dashboards", "Resource inspection", "Namespace operations"],
    },
    helm: {
        id: "helm",
        label: "Helm",
        description: "Helm release management through a host allowlisted Helm policy.",
        scopeId: "helm",
        suggestedCommands: ["helm"],
        typicalUseCases: ["Release dashboards", "Chart upgrade flows", "Helm diff workflows"],
    },
    terraform: {
        id: "terraform",
        label: "Terraform",
        description: "Infrastructure plan and apply workflows through scoped Terraform execution.",
        scopeId: "terraform",
        suggestedCommands: ["terraform"],
        typicalUseCases: ["Plan review", "Apply orchestration", "Workspace management"],
    },
    ansible: {
        id: "ansible",
        label: "Ansible",
        description: "Automation and playbook workflows through allowlisted Ansible tooling.",
        scopeId: "ansible",
        suggestedCommands: ["ansible", "ansible-playbook"],
        typicalUseCases: ["Playbook runners", "Inventory inspection", "Ops automation panels"],
    },
    "aws-cli": {
        id: "aws-cli",
        label: "AWS CLI",
        description: "AWS operational flows through a host allowlisted aws-cli scope.",
        scopeId: "aws-cli",
        suggestedCommands: ["aws"],
        typicalUseCases: ["Cloud inventory", "Operational runbooks", "SSM/EKS workflows"],
    },
    gcloud: {
        id: "gcloud",
        label: "Google Cloud CLI",
        description: "GCP operational flows through scoped gcloud execution.",
        scopeId: "gcloud",
        suggestedCommands: ["gcloud"],
        typicalUseCases: ["GKE workflows", "Project inspection", "Operational tooling"],
    },
    "azure-cli": {
        id: "azure-cli",
        label: "Azure CLI",
        description: "Azure operational flows through host-mediated Azure CLI execution.",
        scopeId: "azure-cli",
        suggestedCommands: ["az"],
        typicalUseCases: ["AKS workflows", "Resource group inspection", "Operational runbooks"],
    },
    podman: {
        id: "podman",
        label: "Podman",
        description: "Rootless container workflows through an allowlisted Podman policy.",
        scopeId: "podman",
        suggestedCommands: ["podman"],
        typicalUseCases: ["Container dashboards", "Image inspection", "Local runtime control"],
    },
    kustomize: {
        id: "kustomize",
        label: "Kustomize",
        description: "Manifest composition and preview workflows through scoped kustomize execution.",
        scopeId: "kustomize",
        suggestedCommands: ["kustomize", "kubectl kustomize"],
        typicalUseCases: ["Manifest preview", "Overlay inspection", "GitOps helpers"],
    },
    gh: {
        id: "gh",
        label: "GitHub CLI",
        description: "Repository and workflow operations through host-mediated GitHub CLI execution.",
        scopeId: "gh",
        suggestedCommands: ["gh"],
        typicalUseCases: ["PR dashboards", "Workflow triage", "Repository automation"],
    },
    git: {
        id: "git",
        label: "Git",
        description: "Repository inspection and controlled Git workflows through a scoped Git policy.",
        scopeId: "git",
        suggestedCommands: ["git"],
        typicalUseCases: ["Diff dashboards", "Status inspection", "Repository automation"],
    },
    vault: {
        id: "vault",
        label: "Vault",
        description: "Secret and auth operations through scoped HashiCorp Vault CLI execution.",
        scopeId: "vault",
        suggestedCommands: ["vault"],
        typicalUseCases: ["Secret inspection", "Lease operations", "Auth troubleshooting"],
    },
    nomad: {
        id: "nomad",
        label: "Nomad",
        description: "Nomad workload operations through host-mediated scoped Nomad CLI execution.",
        scopeId: "nomad",
        suggestedCommands: ["nomad"],
        typicalUseCases: ["Job dashboards", "Allocation inspection", "Cluster operations"],
    },
};

function withCapabilities(preset: Omit<OperatorToolPresetDefinition, "capabilities">): OperatorToolPresetDefinition {
    return {
        ...preset,
        capabilities: createProcessCapabilityBundle(preset.scopeId) as ["system.process.exec", `system.process.scope.${string}`],
    };
}

export function getOperatorToolPreset(presetId: OperatorToolPresetId): OperatorToolPresetDefinition {
    return withCapabilities(PRESET_CONFIG[presetId]);
}

export function listOperatorToolPresets(): OperatorToolPresetDefinition[] {
    return Object.keys(PRESET_CONFIG)
        .sort((left, right) => left.localeCompare(right))
        .map((presetId) => getOperatorToolPreset(presetId as OperatorToolPresetId));
}

export function createOperatorToolCapabilityPreset(presetId: OperatorToolPresetId): PluginCapability[] {
    return [...getOperatorToolPreset(presetId).capabilities];
}

export function createScopedProcessExecActionRequest(
    scopeId: string,
    payload: ProcessExecActionPayloadInput
): ProcessExecActionRequest {
    return createProcessExecActionRequest({
        action: "system.process.exec",
        payload: {
            scope: scopeId,
            ...payload,
        },
    });
}

export function requestScopedProcessExec<TResult = unknown>(
    scopeId: string,
    payload: ProcessExecActionPayloadInput,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<TResult>> {
    return requestPrivilegedAction<TResult>(
        createScopedProcessExecActionRequest(scopeId, payload),
        {
            correlationIdPrefix: scopeId,
            ...options,
        }
    );
}

export function createOperatorToolActionRequest(
    presetId: OperatorToolPresetId,
    payload: ProcessExecActionPayloadInput
): ProcessExecActionRequest {
    return createScopedProcessExecActionRequest(getOperatorToolPreset(presetId).scopeId, payload);
}

export function requestOperatorTool<TResult = unknown>(
    presetId: OperatorToolPresetId,
    payload: ProcessExecActionPayloadInput,
    options?: RequestPrivilegedActionOptions
): Promise<PrivilegedActionResponse<TResult>> {
    const preset = getOperatorToolPreset(presetId);
    return requestScopedProcessExec<TResult>(preset.scopeId, payload, {
        correlationIdPrefix: preset.scopeId,
        ...options,
    });
}

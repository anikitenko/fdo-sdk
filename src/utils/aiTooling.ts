import {
    AICapabilityPresetDefinition,
    AICapabilityPresetId,
    PluginCapability,
} from "../types";
import { createAICapabilityBundle } from "./capabilities";

const PRESET_CONFIG: Record<AICapabilityPresetId, Omit<AICapabilityPresetDefinition, "capabilities">> = {
    "host.ai": {
        id: "host.ai",
        label: "Host AI Core",
        description: "Host-routed AI assistants with discovery + request operations for multi-assistant plugin workflows.",
    },
};

function withCapabilities(
    preset: Omit<AICapabilityPresetDefinition, "capabilities">
): AICapabilityPresetDefinition {
    return {
        ...preset,
        capabilities: createAICapabilityBundle(["assistants.list", "request"]) as [
            "system.ai",
            "system.ai.assistants.list",
            "system.ai.request",
        ],
    };
}

export function getAICapabilityPreset(presetId: AICapabilityPresetId): AICapabilityPresetDefinition {
    return withCapabilities(PRESET_CONFIG[presetId]);
}

export function listAICapabilityPresets(): AICapabilityPresetDefinition[] {
    return Object.keys(PRESET_CONFIG)
        .sort((left, right) => left.localeCompare(right))
        .map((presetId) => getAICapabilityPreset(presetId as AICapabilityPresetId));
}

export function createAICapabilityPreset(presetId: AICapabilityPresetId): PluginCapability[] {
    return [...getAICapabilityPreset(presetId).capabilities];
}

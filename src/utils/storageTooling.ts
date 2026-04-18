import {
    PluginCapability,
    StorageCapabilityPresetDefinition,
    StorageCapabilityPresetId,
} from "../types";
import { createStorageCapabilityBundle } from "./capabilities";

const PRESET_CONFIG: Record<StorageCapabilityPresetId, Omit<StorageCapabilityPresetDefinition, "capabilities">> = {
    storageJSON: {
        id: "storageJSON",
        label: "Storage JSON",
        description: "Persistent plugin JSON storage using the SDK-managed scoped JSON store backend.",
        backendId: "json",
    },
};

function withCapabilities(
    preset: Omit<StorageCapabilityPresetDefinition, "capabilities">
): StorageCapabilityPresetDefinition {
    return {
        ...preset,
        capabilities: createStorageCapabilityBundle(preset.backendId) as ["storage", `storage.${string}`],
    };
}

export function getStorageCapabilityPreset(presetId: StorageCapabilityPresetId): StorageCapabilityPresetDefinition {
    return withCapabilities(PRESET_CONFIG[presetId]);
}

export function listStorageCapabilityPresets(): StorageCapabilityPresetDefinition[] {
    return Object.keys(PRESET_CONFIG)
        .sort((left, right) => left.localeCompare(right))
        .map((presetId) => getStorageCapabilityPreset(presetId as StorageCapabilityPresetId));
}

export function createStorageCapabilityPreset(presetId: StorageCapabilityPresetId): PluginCapability[] {
    return [...getStorageCapabilityPreset(presetId).capabilities];
}

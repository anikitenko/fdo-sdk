import {
    createStorageCapabilityPreset,
    getStorageCapabilityPreset,
    listStorageCapabilityPresets,
} from "../../src";

describe("storage tooling helpers", () => {
    test("returns curated storage preset with capabilities", () => {
        expect(getStorageCapabilityPreset("storageJSON")).toEqual({
            id: "storageJSON",
            label: "Storage JSON",
            description: "Persistent plugin JSON storage using the SDK-managed scoped JSON store backend.",
            backendId: "json",
            capabilities: ["storage", "storage.json"],
        });
    });

    test("lists storage capability presets", () => {
        expect(listStorageCapabilityPresets().map((preset) => preset.id)).toEqual(["storageJSON"]);
    });

    test("creates storage capability preset bundle", () => {
        expect(createStorageCapabilityPreset("storageJSON")).toEqual(["storage", "storage.json"]);
    });
});

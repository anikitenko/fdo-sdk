import {
    getFixtureRuntimeMatrix,
    getFixtureRuntimeMatrixCase,
    listFixtureRuntimeMatrixCases,
} from "../../src";

describe("fixture runtime matrix helpers", () => {
    test("returns versioned fixture runtime matrix with expected fixture ids", () => {
        const matrix = getFixtureRuntimeMatrix();

        expect(matrix.contractVersion).toBe("1");
        expect(matrix.cases.map((entry) => entry.id)).toEqual([
            "minimal",
            "error-handling",
            "storage",
            "operator-kubernetes",
            "operator-terraform",
            "operator-custom-tool",
        ]);
    });

    test("returns cloned fixture entries so callers cannot mutate source definitions", () => {
        const cases = listFixtureRuntimeMatrixCases();
        cases[0].title = "mutated";
        cases[1].probes.uiMessage.push({ handler: "mutated.handler", content: {} });

        const matrix = getFixtureRuntimeMatrix();
        expect(matrix.cases[0].title).toBe("Fixture: Minimal Plugin");
        expect(matrix.cases[1].probes.uiMessage.map((probe) => probe.handler)).toEqual([
            "fixture.ok",
            "fixture.fail",
        ]);
    });

    test("returns null for unknown fixture case id", () => {
        expect(getFixtureRuntimeMatrixCase("missing-case")).toBeNull();
    });

    test("returns the storage fixture case with required storage capabilities", () => {
        const entry = getFixtureRuntimeMatrixCase("storage");
        expect(entry).not.toBeNull();
        expect(entry?.requiredCapabilities).toEqual(["storage", "storage.json"]);
        expect(entry?.probes.uiMessage.map((probe) => probe.handler)).toEqual([
            "storageFixture.v2.getSnapshot",
            "storageFixture.v2.savePreference",
            "storageFixture.v2.recordAction",
        ]);
    });
});

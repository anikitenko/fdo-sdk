import {
    FixtureRuntimeMatrix,
    FixtureRuntimeMatrixCase,
    FixtureRuntimeUiMessageProbe,
} from "../types";

const FIXTURE_RUNTIME_MATRIX_CONTRACT_VERSION: FixtureRuntimeMatrix["contractVersion"] = "1";

const FIXTURE_RUNTIME_MATRIX_CASES: ReadonlyArray<FixtureRuntimeMatrixCase> = [
    {
        id: "minimal",
        title: "Fixture: Minimal Plugin",
        fixturePath: "examples/fixtures/minimal-plugin.fixture.ts",
        description: "Baseline lifecycle smoke without UI bridge handlers.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: false,
            uiMessage: [],
        },
    },
    {
        id: "error-handling",
        title: "Fixture: Error Handling",
        fixturePath: "examples/fixtures/error-handling-plugin.fixture.ts",
        description: "Lifecycle + handler safety with deterministic UI_MESSAGE success/failure probes.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: true,
            uiMessage: [
                {
                    handler: "fixture.ok",
                    content: { source: "fixture-ui" },
                    description: "Success handler probe.",
                },
                {
                    handler: "fixture.fail",
                    content: {},
                    description: "Failure handler probe.",
                },
            ],
        },
    },
    {
        id: "storage",
        title: "Fixture: Storage",
        fixturePath: "examples/fixtures/storage-plugin.fixture.ts",
        description: "Store initialization, fallback behavior, and storage-focused UI_MESSAGE probes.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: true,
            uiMessage: [
                {
                    handler: "storageFixture.v2.getSnapshot",
                    content: {},
                },
                {
                    handler: "storageFixture.v2.savePreference",
                    content: { theme: "dark" },
                },
                {
                    handler: "storageFixture.v2.recordAction",
                    content: { action: "storage-fixture-ui-click" },
                },
            ],
        },
        requiredCapabilities: ["storage", "storage.json"],
    },
    {
        id: "operator-kubernetes",
        title: "Fixture: Kubernetes Operator",
        fixturePath: "examples/fixtures/operator-kubernetes-plugin.fixture.ts",
        description: "Curated kubectl preset envelope probes for single-action + workflow paths.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: true,
            uiMessage: [
                {
                    handler: "kubectlFixture.v2.previewClusterObjects",
                    content: {},
                },
                {
                    handler: "kubectlFixture.v2.inspectAndRestartWorkflow",
                    content: {},
                },
            ],
        },
        requiredCapabilities: ["system.process.exec", "system.process.scope.kubectl"],
    },
    {
        id: "operator-terraform",
        title: "Fixture: Terraform Operator",
        fixturePath: "examples/fixtures/operator-terraform-plugin.fixture.ts",
        description: "Curated terraform preset envelope probes for plan + preview/apply workflow paths.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: true,
            uiMessage: [
                {
                    handler: "terraformFixture.v2.previewPlan",
                    content: {},
                },
                {
                    handler: "terraformFixture.v2.previewApplyWorkflow",
                    content: {},
                },
            ],
        },
        requiredCapabilities: ["system.process.exec", "system.process.scope.terraform"],
    },
    {
        id: "operator-custom-tool",
        title: "Fixture: Custom Operator Tool",
        fixturePath: "examples/fixtures/operator-custom-tool-plugin.fixture.ts",
        description: "Custom scoped process envelope probe for host-specific internal tools.",
        probes: {
            init: true,
            render: true,
            renderOnLoad: true,
            uiMessage: [
                {
                    handler: "customToolFixture.v2.previewRunnerStatus",
                    content: {},
                },
            ],
        },
        requiredCapabilities: ["system.process.exec", "system.process.scope.internal-runner"],
    },
];

function cloneUiMessageProbe(probe: FixtureRuntimeUiMessageProbe): FixtureRuntimeUiMessageProbe {
    return {
        handler: probe.handler,
        description: probe.description,
        content: cloneRecord(probe.content),
    };
}

function cloneRecord(record?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!record) {
        return undefined;
    }
    return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function cloneMatrixCase(entry: FixtureRuntimeMatrixCase): FixtureRuntimeMatrixCase {
    return {
        id: entry.id,
        title: entry.title,
        fixturePath: entry.fixturePath,
        description: entry.description,
        probes: {
            init: true,
            render: true,
            renderOnLoad: entry.probes.renderOnLoad,
            uiMessage: entry.probes.uiMessage.map((probe) => cloneUiMessageProbe(probe)),
        },
        requiredCapabilities: entry.requiredCapabilities ? [...entry.requiredCapabilities] : undefined,
    };
}

export function listFixtureRuntimeMatrixCases(): FixtureRuntimeMatrixCase[] {
    return FIXTURE_RUNTIME_MATRIX_CASES.map((entry) => cloneMatrixCase(entry));
}

export function getFixtureRuntimeMatrixCase(id: string): FixtureRuntimeMatrixCase | null {
    const entry = FIXTURE_RUNTIME_MATRIX_CASES.find((candidate) => candidate.id === id);
    if (!entry) {
        return null;
    }
    return cloneMatrixCase(entry);
}

export function getFixtureRuntimeMatrix(): FixtureRuntimeMatrix {
    return {
        contractVersion: FIXTURE_RUNTIME_MATRIX_CONTRACT_VERSION,
        cases: listFixtureRuntimeMatrixCases(),
    };
}

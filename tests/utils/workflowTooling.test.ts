import {
    createScopedWorkflowRequest,
    requestScopedWorkflow,
} from "../../src";

describe("workflow tooling helpers", () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
        if (originalWindow) {
            globalThis.window = originalWindow;
            return;
        }

        delete (globalThis as { window?: Window }).window;
    });

    test("creates a scoped workflow request", () => {
        expect(createScopedWorkflowRequest("terraform", {
            kind: "process-sequence",
            title: "Terraform preview and apply",
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
                },
            ],
        })).toEqual({
            action: "system.workflow.run",
            payload: {
                scope: "terraform",
                kind: "process-sequence",
                title: "Terraform preview and apply",
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
                    },
                ],
            },
        });
    });

    test("requests a scoped workflow through the privileged transport", async () => {
        const createBackendReq = vi.fn().mockResolvedValue({
            ok: true,
            correlationId: "terraform-workflow-1",
            result: {
                workflowId: "wf-1",
                scope: "terraform",
                kind: "process-sequence",
                status: "completed",
                summary: {
                    totalSteps: 1,
                    completedSteps: 1,
                    failedSteps: 0,
                    skippedSteps: 0,
                },
                steps: [
                    {
                        stepId: "plan",
                        title: "Generate plan",
                        status: "ok",
                        correlationId: "terraform-step-1",
                        result: { stdout: "ok" },
                    },
                ],
            },
        });
        globalThis.window = { createBackendReq } as unknown as Window;

        await expect(requestScopedWorkflow("terraform", {
            kind: "process-sequence",
            title: "Terraform preview and apply",
            steps: [
                {
                    id: "plan",
                    title: "Generate plan",
                    command: "/usr/local/bin/terraform",
                    args: ["plan", "-input=false"],
                },
            ],
        })).resolves.toEqual({
            ok: true,
            correlationId: "terraform-workflow-1",
            result: {
                workflowId: "wf-1",
                scope: "terraform",
                kind: "process-sequence",
                status: "completed",
                summary: {
                    totalSteps: 1,
                    completedSteps: 1,
                    failedSteps: 0,
                    skippedSteps: 0,
                },
                steps: [
                    {
                        stepId: "plan",
                        title: "Generate plan",
                        status: "ok",
                        correlationId: "terraform-step-1",
                        result: { stdout: "ok" },
                    },
                ],
            },
        });

        expect(createBackendReq).toHaveBeenCalledWith("requestPrivilegedAction", {
            correlationId: expect.stringMatching(/^terraform-workflow-\d+$/),
            request: {
                action: "system.workflow.run",
                payload: {
                    scope: "terraform",
                    kind: "process-sequence",
                    title: "Terraform preview and apply",
                    steps: [
                        {
                            id: "plan",
                            title: "Generate plan",
                            command: "/usr/local/bin/terraform",
                            args: ["plan", "-input=false"],
                        },
                    ],
                },
            },
        });
    });
});

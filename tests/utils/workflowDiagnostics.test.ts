import {
    createWorkflowFailureDiagnostic,
    getFailedWorkflowSteps,
    summarizeWorkflowResult,
} from "../../src";

describe("workflow diagnostics helpers", () => {
    const baseResult = {
        workflowId: "wf-1",
        scope: "terraform",
        kind: "process-sequence" as const,
        status: "partial" as const,
        summary: {
            totalSteps: 2,
            completedSteps: 1,
            failedSteps: 1,
            skippedSteps: 0,
        },
        steps: [
            {
                stepId: "plan",
                title: "Generate plan",
                status: "ok" as const,
                correlationId: "terraform-step-1",
                result: {
                    command: "/usr/local/bin/terraform",
                    args: ["plan", "-input=false"],
                    exitCode: 0,
                    stdout: "plan ok",
                    stderr: "",
                    durationMs: 100,
                },
            },
            {
                stepId: "apply",
                title: "Apply plan",
                status: "error" as const,
                correlationId: "terraform-step-2",
                error: "confirmation denied",
                code: "CONFIRMATION_DENIED",
            },
        ],
    };

    test("summarizes workflow results", () => {
        expect(summarizeWorkflowResult(baseResult)).toEqual({
            workflowId: "wf-1",
            scope: "terraform",
            kind: "process-sequence",
            status: "partial",
            totalSteps: 2,
            completedSteps: 1,
            failedSteps: 1,
            skippedSteps: 0,
        });
    });

    test("returns failed workflow steps", () => {
        expect(getFailedWorkflowSteps(baseResult)).toEqual([
            {
                stepId: "apply",
                title: "Apply plan",
                status: "error",
                correlationId: "terraform-step-2",
                error: "confirmation denied",
                code: "CONFIRMATION_DENIED",
            },
        ]);
    });

    test("creates workflow failure diagnostics", () => {
        expect(createWorkflowFailureDiagnostic(baseResult)).toEqual({
            workflowId: "wf-1",
            scope: "terraform",
            status: "partial",
            failedStepIds: ["apply"],
            failedStepTitles: ["Apply plan"],
            firstFailedStep: {
                stepId: "apply",
                title: "Apply plan",
                correlationId: "terraform-step-2",
                error: "confirmation denied",
                code: "CONFIRMATION_DENIED",
            },
            remediation: 'Review the failed workflow step correlation id and host policy for scope "terraform" before retrying.',
        });
    });

    test("returns null when no workflow steps failed", () => {
        expect(createWorkflowFailureDiagnostic({
            ...baseResult,
            status: "completed",
            summary: {
                totalSteps: 1,
                completedSteps: 1,
                failedSteps: 0,
                skippedSteps: 0,
            },
            steps: [baseResult.steps[0]],
        })).toBeNull();
    });
});

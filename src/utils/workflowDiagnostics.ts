import {
    ScopedWorkflowResult,
    ScopedWorkflowStepResult,
} from "../types";

export type WorkflowFailureDiagnostic = {
    workflowId: string;
    scope: string;
    status: ScopedWorkflowResult["status"];
    failedStepIds: string[];
    failedStepTitles: string[];
    firstFailedStep?: {
        stepId: string;
        title: string;
        correlationId?: string;
        error?: string;
        code?: string;
    };
    remediation: string;
};

export function summarizeWorkflowResult(result: ScopedWorkflowResult): {
    workflowId: string;
    scope: string;
    kind: ScopedWorkflowResult["kind"];
    status: ScopedWorkflowResult["status"];
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
} {
    return {
        workflowId: result.workflowId,
        scope: result.scope,
        kind: result.kind,
        status: result.status,
        totalSteps: result.summary.totalSteps,
        completedSteps: result.summary.completedSteps,
        failedSteps: result.summary.failedSteps,
        skippedSteps: result.summary.skippedSteps,
    };
}

export function getFailedWorkflowSteps(result: ScopedWorkflowResult): ScopedWorkflowStepResult[] {
    return result.steps.filter((step) => step.status === "error");
}

export function createWorkflowFailureDiagnostic(result: ScopedWorkflowResult): WorkflowFailureDiagnostic | null {
    const failedSteps = getFailedWorkflowSteps(result);
    if (failedSteps.length === 0) {
        return null;
    }

    const firstFailedStep = failedSteps[0];
    return {
        workflowId: result.workflowId,
        scope: result.scope,
        status: result.status,
        failedStepIds: failedSteps.map((step) => step.stepId),
        failedStepTitles: failedSteps.map((step) => step.title),
        firstFailedStep: {
            stepId: firstFailedStep.stepId,
            title: firstFailedStep.title,
            correlationId: firstFailedStep.correlationId,
            error: firstFailedStep.error,
            code: firstFailedStep.code,
        },
        remediation: `Review the failed workflow step correlation id and host policy for scope "${result.scope}" before retrying.`,
    };
}

import {
    PrivilegedActionErrorFormatOptions,
    PrivilegedActionErrorResponse,
    PrivilegedActionResponse,
    PrivilegedActionSuccessResponse,
} from "../types";

export function createPrivilegedActionCorrelationId(prefix: string = "privileged-action"): string {
    const normalizedPrefix = prefix.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "privileged-action";
    return `${normalizedPrefix}-${Date.now()}`;
}

export function isPrivilegedActionSuccessResponse<TResult = unknown>(
    value: unknown
): value is PrivilegedActionSuccessResponse<TResult> {
    return Boolean(value)
        && typeof value === "object"
        && (value as PrivilegedActionSuccessResponse<TResult>).ok === true
        && typeof (value as PrivilegedActionSuccessResponse<TResult>).correlationId === "string";
}

export function isPrivilegedActionErrorResponse(value: unknown): value is PrivilegedActionErrorResponse {
    return Boolean(value)
        && typeof value === "object"
        && (value as PrivilegedActionErrorResponse).ok === false
        && typeof (value as PrivilegedActionErrorResponse).correlationId === "string"
        && typeof (value as PrivilegedActionErrorResponse).error === "string";
}

export function unwrapPrivilegedActionResponse<TResult = unknown>(
    response: PrivilegedActionResponse<TResult>
): TResult | undefined {
    if (response.ok) {
        return response.result;
    }

    const error = new Error(response.error);
    if (response.code) {
        Object.assign(error, { code: response.code });
    }
    throw error;
}

export function formatPrivilegedActionError(
    response: unknown,
    options?: PrivilegedActionErrorFormatOptions
): string {
    const responseRecord = (response && typeof response === "object")
        ? response as Record<string, unknown>
        : {};
    const context = typeof options?.context === "string" && options.context.trim().length > 0
        ? options.context.trim()
        : "Privileged action failed";
    const fallbackCorrelationId = typeof options?.fallbackCorrelationId === "string"
        ? options.fallbackCorrelationId
        : "";
    const correlationIdRaw = responseRecord["correlationId"];
    const correlationId = typeof correlationIdRaw === "string" && correlationIdRaw.trim().length > 0
        ? correlationIdRaw.trim()
        : (fallbackCorrelationId.trim() || "unknown");
    const errorRaw = responseRecord["error"];
    const errorMessage = typeof errorRaw === "string" && errorRaw.trim().length > 0
        ? errorRaw.trim()
        : "Unknown host error";
    const codeRaw = responseRecord["code"];
    const codeSuffix = typeof codeRaw === "string" && codeRaw.trim().length > 0
        ? ` (${codeRaw.trim()})`
        : "";
    const includeStdoutWhenStderrMissing = options?.includeStdoutWhenStderrMissing !== false;
    const maxDetailLength = (
        typeof options?.maxDetailLength === "number" && Number.isFinite(options.maxDetailLength) && options.maxDetailLength > 0
    ) ? Math.trunc(options.maxDetailLength) : 1200;
    const truncate = (value: string): string => value.length > maxDetailLength
        ? `${value.slice(0, maxDetailLength)}...`
        : value;

    const resultRaw = responseRecord["result"];
    const result = (resultRaw && typeof resultRaw === "object")
        ? resultRaw as Record<string, unknown>
        : null;
    const stderrRaw = result?.["stderr"];
    const stdoutRaw = result?.["stdout"];
    const stderr = typeof stderrRaw === "string" ? stderrRaw.trim() : "";
    const stdout = typeof stdoutRaw === "string" ? stdoutRaw.trim() : "";
    const detailLines: string[] = [];

    if (stderr) {
        detailLines.push(`stderr: ${truncate(stderr)}`);
    } else if (includeStdoutWhenStderrMissing && stdout) {
        detailLines.push(`stdout: ${truncate(stdout)}`);
    }

    const exitCodeRaw = result?.["exitCode"];
    if (typeof exitCodeRaw === "number" || typeof exitCodeRaw === "string") {
        const exitCode = String(exitCodeRaw).trim();
        if (exitCode.length > 0) {
            detailLines.push(`exitCode: ${exitCode}`);
        }
    }

    const commandRaw = result?.["command"];
    const command = typeof commandRaw === "string" ? commandRaw.trim() : "";
    const argsRaw = result?.["args"];
    const args = Array.isArray(argsRaw)
        ? argsRaw.filter((value) => typeof value === "string").map((value) => String(value))
        : [];
    if (command) {
        const commandLine = args.length > 0
            ? `${command} ${args.join(" ")}`
            : command;
        detailLines.push(`command: ${truncate(commandLine)}`);
    }

    const cwdRaw = result?.["cwd"];
    const cwd = typeof cwdRaw === "string" ? cwdRaw.trim() : "";
    if (cwd) {
        detailLines.push(`cwd: ${truncate(cwd)}`);
    }

    const details = detailLines.length > 0
        ? `\n${detailLines.join("\n")}`
        : "";
    return `${context}${codeSuffix}: ${errorMessage}${details}\nCorrelation ID: ${correlationId}`;
}

export function getInlinePrivilegedActionErrorFormatterSource(): string {
    return `(${formatPrivilegedActionError.toString()})`;
}

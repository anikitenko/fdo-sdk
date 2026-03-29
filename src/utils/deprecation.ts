export type DeprecationNotice = {
    id: string;
    message: string;
    replacement?: string;
    removeIn?: string;
    docsUrl?: string;
};

const emittedDeprecations = new Set<string>();

export function formatDeprecationMessage(notice: DeprecationNotice): string {
    const details = [
        `[DEPRECATED:${notice.id}] ${notice.message}`,
        notice.replacement ? `Use ${notice.replacement} instead.` : "",
        notice.removeIn ? `Planned removal: ${notice.removeIn}.` : "",
        notice.docsUrl ? `Docs: ${notice.docsUrl}` : "",
    ].filter(Boolean);

    return details.join(" ");
}

export function emitDeprecationWarning(
    notice: DeprecationNotice,
    warn: (message: string) => void = (message) => console.warn(message)
): void {
    if (emittedDeprecations.has(notice.id)) {
        return;
    }

    emittedDeprecations.add(notice.id);
    warn(formatDeprecationMessage(notice));
}

export function resetDeprecationWarningsForTests(): void {
    emittedDeprecations.clear();
}

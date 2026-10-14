import type { DOMOptions } from '../DOM';

/** Reasons are emitted once for each open/close cycle. */
export type UICloseReason = 'confirm' | 'cancel' | 'escape' | 'programmatic' | 'dismiss' | 'destroy';
export type UIState = Readonly<{ open: boolean; destroyed: boolean; pending: boolean; error: string | null; closeReason: UICloseReason | null }>;
export type UIDiagnostic = { code: string; message: string; detail?: string };
export type UIStyleOptions = Partial<Pick<DOMOptions, 'classes' | 'style'>>;

/** Serializable markup only. HTML slots are trusted fragments; title/description are escaped text. */
export interface DialogMarkupOptions {
    id: string;
    title?: string;
    description?: string;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    body?: string;
    footer?: string;
    options?: UIStyleOptions;
    cancelLabel?: string;
}
export interface ConfirmationDialogMarkupOptions extends DialogMarkupOptions {
    confirmLabel?: string;
    pendingLabel?: string;
}
export interface PopoverMarkupOptions extends Omit<DialogMarkupOptions, 'cancelLabel'> {}

/** Callbacks run only after explicit frontend mounting; no backend transport is implicit. */
export interface UIMountOptions {
    initialFocus?: HTMLElement;
    restoreFocus?: boolean;
    onClose?: (reason: UICloseReason) => void | Promise<void>;
    onStateChange?: (state: UIState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface DialogController {
    open(opener?: HTMLElement): void;
    close(reason?: UICloseReason): void;
    getState(): UIState;
    destroy(): void;
}
export interface ConfirmationDialogMountOptions extends UIMountOptions {
    /** Cancellation/teardown aborts this signal; caller must honor it for external work. */
    onConfirm: (context: { signal: AbortSignal }) => void | Promise<void>;
    formatError?: (error: unknown) => string;
}
export interface ConfirmationDialogController extends DialogController {
    /** Coalesces concurrent calls; false on cancellation/failure, true on successful confirmation. */
    confirm(): Promise<boolean>;
}
export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
export interface PopoverMountOptions extends UIMountOptions {
    anchor: HTMLElement;
    placement?: PopoverPlacement;
    gap?: number;
    viewportPadding?: number;
    /** Shift into the visual viewport; flip also switches top/bottom when space is insufficient. */
    overflow?: 'shift' | 'flip';
}
export interface PopoverController extends DialogController {
    updatePosition(): void;
}

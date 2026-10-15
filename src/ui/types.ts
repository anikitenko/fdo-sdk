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

/** A missing/null value is indeterminate; determinate values must be within [0, max]. */
export interface ProgressBarMarkupOptions {
    id: string;
    label?: string;
    value?: number | null;
    max?: number;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    options?: UIStyleOptions;
}
export type ProgressBarState = Readonly<{ value: number | null; max: number; destroyed: boolean }>;
export interface ProgressBarMountOptions {
    onStateChange?: (state: ProgressBarState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface ProgressBarController {
    setValue(value: number | null, max?: number): void;
    getState(): ProgressBarState;
    destroy(): void;
}
export type ToastVariant = 'info' | 'success' | 'warning' | 'error';
export type ToastCloseReason = 'dismiss' | 'timeout' | 'programmatic' | 'destroy';
export interface ToastMarkupOptions {
    id: string;
    message: string;
    title?: string;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    variant?: ToastVariant;
    dismissLabel?: string;
    /** Composed progress is independently labelled. No automatic completion/dismissal is implied. */
    progress?: Omit<ProgressBarMarkupOptions, 'id'>;
    options?: UIStyleOptions;
}
export interface ToastUpdate {
    message?: string;
    title?: string;
    variant?: ToastVariant;
}
export type ToastState = Readonly<{
    open: boolean;
    destroyed: boolean;
    paused: boolean;
    variant: ToastVariant;
    closeReason: ToastCloseReason | null;
    progress: ProgressBarState | null;
}>;
export interface ToastMountOptions {
    /** Milliseconds of unpaused visibility; 0 (default) disables automatic dismissal. */
    duration?: number;
    onClose?: (reason: ToastCloseReason) => void | Promise<void>;
    onStateChange?: (state: ToastState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface ToastController {
    show(): void;
    close(reason?: ToastCloseReason): void;
    update(content: ToastUpdate): void;
    /** Requires progress to have been included during composition. */
    setProgress(value: number | null, max?: number): void;
    pause(): void;
    resume(): void;
    getState(): ToastState;
    destroy(): void;
}

export interface InlineAlertMarkupOptions extends Omit<ToastMarkupOptions, 'progress' | 'dismissLabel'> {
    visible?: boolean;
}
export type InlineAlertState = Readonly<{ visible: boolean; variant: ToastVariant; destroyed: boolean }>;
export interface InlineAlertMountOptions {
    onStateChange?: (state: InlineAlertState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface InlineAlertController {
    show(): void;
    hide(): void;
    update(content: ToastUpdate): void;
    getState(): InlineAlertState;
    destroy(): void;
}
export interface ToastRegionMarkupOptions {
    id: string;
    label: string;
    /** Trusted composed toast HTML; the region does not enqueue it automatically. */
    body?: string;
    options?: UIStyleOptions;
}
export type ToastRegionState = Readonly<{
    destroyed: boolean;
    entries: ReadonlyArray<Readonly<{ key: string; status: 'visible' | 'queued' }>>;
}>;
export interface ToastRegionMountOptions {
    maxVisible?: number;
    maxQueued?: number;
    onStateChange?: (state: ToastRegionState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface ToastRegionEntryOptions extends ToastMountOptions { key?: string; }
export interface ToastRegionController {
    /** Accept a composed toast element already inserted inside this region. Duplicate keys/full queues return false. */
    enqueue(root: HTMLElement, options?: ToastRegionEntryOptions): boolean;
    dismiss(key: string): void;
    update(key: string, content: ToastUpdate): void;
    setProgress(key: string, value: number | null, max?: number): void;
    clear(): void;
    getState(): ToastRegionState;
    destroy(): void;
}
export interface AsyncActionButtonMarkupOptions {
    id: string;
    label: string;
    pendingLabel?: string;
    successLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
    options?: UIStyleOptions;
}
export type AsyncActionPhase = 'idle' | 'pending' | 'success' | 'error' | 'cancelled';
export type AsyncActionButtonState = Readonly<{ phase: AsyncActionPhase; error: string | null; disabled: boolean; destroyed: boolean }>;
export interface AsyncActionButtonMountOptions {
    /** Supplied explicitly; never routed to a backend implicitly. Honor signal for cancellable external work. */
    onAction: (context: { signal: AbortSignal }) => void | Promise<void>;
    formatError?: (error: unknown) => string;
    onStateChange?: (state: AsyncActionButtonState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface AsyncActionButtonController {
    /** Coalesces concurrent calls; false on failure, cancellation, disabled or destroyed state. */
    run(): Promise<boolean>;
    cancel(): void;
    reset(): void;
    setDisabled(disabled: boolean): void;
    getState(): AsyncActionButtonState;
    destroy(): void;
}
export interface TabItem {
    key: string;
    label: string;
    /** Trusted HTML composition. */
    body: string;
    disabled?: boolean;
}
export interface TabsMarkupOptions {
    id: string;
    label: string;
    items: TabItem[];
    activeKey?: string;
    orientation?: 'horizontal' | 'vertical';
    options?: UIStyleOptions;
}
export type TabsState = Readonly<{ activeKey: string; destroyed: boolean }>;
export interface TabsMountOptions {
    activation?: 'automatic' | 'manual';
    onStateChange?: (state: TabsState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface TabsController {
    select(key: string, focus?: boolean): void;
    getState(): TabsState;
    destroy(): void;
}
export interface DisclosureMarkupOptions {
    id: string;
    title: string;
    /** Trusted HTML composition. */
    body: string;
    open?: boolean;
    options?: UIStyleOptions;
}
export type DisclosureState = Readonly<{ open: boolean; destroyed: boolean }>;
export interface DisclosureMountOptions {
    onStateChange?: (state: DisclosureState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface DisclosureController {
    setOpen(open: boolean): void;
    toggle(): void;
    getState(): DisclosureState;
    destroy(): void;
}
export interface AccordionItem {
    key: string;
    title: string;
    /** Trusted HTML composition. */
    body: string;
    open?: boolean;
}
export interface AccordionMarkupOptions {
    id: string;
    label: string;
    items: AccordionItem[];
    /** Default false: at most one section is open; all may be closed. */
    multiple?: boolean;
    options?: UIStyleOptions;
}
export type AccordionState = Readonly<{ openKeys: ReadonlyArray<string>; destroyed: boolean }>;
export interface AccordionMountOptions {
    onStateChange?: (state: AccordionState) => void | Promise<void>;
    onDiagnostic?: (diagnostic: UIDiagnostic) => void | Promise<void>;
}
export interface AccordionController {
    setOpen(key: string, open: boolean): void;
    getState(): AccordionState;
    destroy(): void;
}
export interface ComponentGalleryOptions { id?: string; }

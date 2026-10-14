/** Declarative identity and editor policy. Contains no handler expressions or source history. */
export const UI_COMPONENT_CONTRACT_VERSION = '1.0.0';
export const UI_COMPONENT_DEFINITIONS = [
    {
        identity: 'fdo.dialog', name: 'Dialog', create: 'createDialog', mount: 'mountDialog',
        markupType: 'DialogMarkupOptions', mountType: 'UIMountOptions', controllerType: 'DialogController',
        primitive: 'dialog', role: 'dialog', readonlySlots: ['actions'],
        properties: ['id', 'title', 'description', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy', 'cancelLabel', 'options.classes', 'options.style'],
        slots: [{ name: 'body', property: 'body', kind: 'trusted-html' }, { name: 'footer', property: 'footer', kind: 'trusted-html' }],
        states: ['closed', 'open', 'destroyed'], events: ['onClose', 'onStateChange', 'onDiagnostic'],
        automaticCloseReasons: ['cancel', 'escape', 'programmatic', 'destroy'],
    },
    {
        identity: 'fdo.confirmation-dialog', name: 'Confirmation Dialog', create: 'createConfirmationDialog', mount: 'mountConfirmationDialog',
        markupType: 'ConfirmationDialogMarkupOptions', mountType: 'ConfirmationDialogMountOptions', controllerType: 'ConfirmationDialogController',
        primitive: 'dialog', role: 'alertdialog', readonlySlots: ['actions', 'status', 'error'],
        properties: ['id', 'title', 'description', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy', 'cancelLabel', 'confirmLabel', 'pendingLabel', 'options.classes', 'options.style'],
        slots: [{ name: 'body', property: 'body', kind: 'trusted-html' }, { name: 'footer', property: 'footer', kind: 'trusted-html' }],
        states: ['closed', 'open', 'pending', 'error', 'destroyed'], events: ['onConfirm', 'onClose', 'onStateChange', 'onDiagnostic'],
        automaticCloseReasons: ['confirm', 'cancel', 'escape', 'programmatic', 'destroy'],
    },
    {
        identity: 'fdo.popover', name: 'Popover', create: 'createPopover', mount: 'mountPopover',
        markupType: 'PopoverMarkupOptions', mountType: 'PopoverMountOptions', controllerType: 'PopoverController',
        primitive: 'popover', role: 'region', readonlySlots: [],
        properties: ['id', 'title', 'description', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy', 'options.classes', 'options.style'],
        slots: [{ name: 'body', property: 'body', kind: 'trusted-html' }, { name: 'footer', property: 'footer', kind: 'trusted-html' }],
        states: ['closed', 'open', 'destroyed'], events: ['onClose', 'onStateChange', 'onDiagnostic'],
        automaticCloseReasons: ['cancel', 'escape', 'dismiss', 'programmatic', 'destroy'],
    },
] as const;

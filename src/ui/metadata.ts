/** Declarative identity and editor policy. Contains no handler expressions or source history. */
export const UI_COMPONENT_CONTRACT_VERSION = '1.2.0';
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
    {
        identity: 'fdo.progress-bar', name: 'Progress Bar', create: 'createProgressBar', mount: 'mountProgressBar',
        markupType: 'ProgressBarMarkupOptions', mountType: 'ProgressBarMountOptions', controllerType: 'ProgressBarController',
        primitive: 'progress', role: 'progressbar', readonlySlots: [],
        properties: ['id', 'label', 'value', 'max', 'ariaLabelledBy', 'ariaDescribedBy', 'options.classes', 'options.style'],
        slots: [], states: ['determinate', 'indeterminate', 'destroyed'], events: ['onStateChange', 'onDiagnostic'],
        automaticCloseReasons: [], closeReasonType: null,
    },
    {
        identity: 'fdo.toast', name: 'Toast', create: 'createToast', mount: 'mountToast',
        markupType: 'ToastMarkupOptions', mountType: 'ToastMountOptions', controllerType: 'ToastController',
        primitive: 'live-region', role: 'status', readonlySlots: ['title', 'message', 'progress'],
        properties: ['id', 'title', 'message', 'ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy', 'variant', 'dismissLabel', 'progress', 'progress.label', 'progress.value', 'progress.max', 'progress.ariaLabelledBy', 'progress.ariaDescribedBy', 'progress.options.classes', 'progress.options.style', 'options.classes', 'options.style'],
        slots: [{ name: 'title', property: 'title', kind: 'text' }, { name: 'message', property: 'message', kind: 'text' }, { name: 'progress', property: 'progress', kind: 'component' }],
        states: ['closed', 'open', 'destroyed'], events: ['onClose', 'onStateChange', 'onDiagnostic'],
        automaticCloseReasons: ['dismiss', 'timeout', 'programmatic', 'destroy'], closeReasonType: 'ToastCloseReason',
        rolesByVariant: { info: 'status', success: 'status', warning: 'alert', error: 'alert' },
        childComponents: { progress: 'fdo.progress-bar' },
    },
    {
        "identity": "fdo.inline-alert",
        "name": "Inline Alert",
        "create": "createInlineAlert",
        "mount": "mountInlineAlert",
        "markupType": "InlineAlertMarkupOptions",
        "mountType": "InlineAlertMountOptions",
        "controllerType": "InlineAlertController",
        "primitive": "live-region",
        "role": "status",
        "readonlySlots": [],
        "properties": [
            "id",
            "title",
            "message",
            "ariaLabel",
            "ariaLabelledBy",
            "ariaDescribedBy",
            "variant",
            "visible",
            "options.classes",
            "options.style"
        ],
        "slots": [
            {
                "name": "title",
                "property": "title",
                "kind": "text"
            },
            {
                "name": "message",
                "property": "message",
                "kind": "text"
            }
        ],
        "states": [
            "visible",
            "hidden",
            "destroyed"
        ],
        "events": [
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
    {
        "identity": "fdo.toast-region",
        "name": "Toast Region",
        "create": "createToastRegion",
        "mount": "mountToastRegion",
        "markupType": "ToastRegionMarkupOptions",
        "mountType": "ToastRegionMountOptions",
        "controllerType": "ToastRegionController",
        "primitive": "section",
        "role": "region",
        "readonlySlots": [],
        "properties": [
            "id",
            "label",
            "options.classes",
            "options.style"
        ],
        "slots": [
            {
                "name": "body",
                "property": "body",
                "kind": "trusted-html"
            }
        ],
        "states": [
            "empty",
            "active",
            "destroyed"
        ],
        "events": [
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
    {
        "identity": "fdo.async-action-button",
        "name": "Async Action Button",
        "create": "createAsyncActionButton",
        "mount": "mountAsyncActionButton",
        "markupType": "AsyncActionButtonMarkupOptions",
        "mountType": "AsyncActionButtonMountOptions",
        "controllerType": "AsyncActionButtonController",
        "primitive": "button",
        "role": "group",
        "readonlySlots": [],
        "properties": [
            "id",
            "label",
            "pendingLabel",
            "successLabel",
            "cancelLabel",
            "disabled",
            "options.classes",
            "options.style"
        ],
        "slots": [],
        "states": [
            "idle",
            "pending",
            "success",
            "error",
            "cancelled",
            "destroyed"
        ],
        "events": [
            "onAction",
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
    {
        "identity": "fdo.tabs",
        "name": "Tabs",
        "create": "createTabs",
        "mount": "mountTabs",
        "markupType": "TabsMarkupOptions",
        "itemType": "TabItem",
        "mountType": "TabsMountOptions",
        "controllerType": "TabsController",
        "primitive": "tabs",
        "role": "group",
        "readonlySlots": [],
        "properties": [
            "id",
            "label",
            "items",
            "activeKey",
            "orientation",
            "options.classes",
            "options.style"
        ],
        "slots": [
            {
                "name": "panels",
                "property": "items",
                "kind": "collection"
            }
        ],
        "states": [
            "active",
            "destroyed"
        ],
        "events": [
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
    {
        "identity": "fdo.disclosure",
        "name": "Disclosure",
        "create": "createDisclosure",
        "mount": "mountDisclosure",
        "markupType": "DisclosureMarkupOptions",
        "mountType": "DisclosureMountOptions",
        "controllerType": "DisclosureController",
        "primitive": "details",
        "role": "group",
        "readonlySlots": [],
        "properties": [
            "id",
            "title",
            "open",
            "options.classes",
            "options.style"
        ],
        "slots": [
            {
                "name": "body",
                "property": "body",
                "kind": "trusted-html"
            }
        ],
        "states": [
            "closed",
            "open",
            "destroyed"
        ],
        "events": [
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
    {
        "identity": "fdo.accordion",
        "name": "Accordion",
        "create": "createAccordion",
        "mount": "mountAccordion",
        "markupType": "AccordionMarkupOptions",
        "itemType": "AccordionItem",
        "mountType": "AccordionMountOptions",
        "controllerType": "AccordionController",
        "primitive": "accordion",
        "role": "region",
        "readonlySlots": [],
        "properties": [
            "id",
            "label",
            "items",
            "multiple",
            "options.classes",
            "options.style"
        ],
        "slots": [
            {
                "name": "items",
                "property": "items",
                "kind": "collection"
            }
        ],
        "states": [
            "closed",
            "open",
            "destroyed"
        ],
        "events": [
            "onStateChange",
            "onDiagnostic"
        ],
        "automaticCloseReasons": [],
        "closeReasonType": null
    },
] as const;

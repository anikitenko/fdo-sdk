# SDK UI components

The API follows the existing SDK split: pure HTML-string composition with `DOM`, then explicit frontend mounting on actual elements. The additive exports are available from the SDK root and from `@anikitenko/fdo-sdk/ui`. Use `/ui` in frontend bundles or a host-provided import map: its ESM artifact is browser-safe and imports no Node/Electron/backend modules. The existing root entry remains Node/CommonJS-oriented.

## Public API

| Component           | Composition                                      | Frontend mount                                      | Controller                                                   |
| ------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| Dialog              | `createDialog(dom, options): string`             | `mountDialog(root, options?)`                       | `open(opener?)`, `close(reason?)`, `getState()`, `destroy()` |
| Confirmation Dialog | `createConfirmationDialog(dom, options): string` | `mountConfirmationDialog(root, { onConfirm, ... })` | Dialog methods plus `confirm(): Promise<boolean>`            |
| Popover             | `createPopover(dom, options): string`            | `mountPopover(root, { anchor, ... })`               | Dialog methods plus `updatePosition()`                       |

[Generated API documentation](UI_COMPONENT_API.generated.md) contains compiler-derived signatures, editable property types and all exported option/controller types. The [complete example](../examples/14-sdk-ui-components.ts) provides separate markup and mount functions with explicit cleanup.

```typescript verify
import { DOM, createDialog, createConfirmationDialog, createPopover } from '@anikitenko/fdo-sdk/ui';
const dom = new DOM().collectStylesFrom();
const dialog = createDialog(dom, {
  id: 'plugin-details', title: 'Details', description: 'Review these settings.',
  body: '<p>Trusted composed HTML.</p>',
  options: { style: { '--fdo-ui-background': '#fff', '--fdo-ui-width': '28rem' } },
});
const confirmation = createConfirmationDialog(dom, {
  id: 'plugin-confirm', title: 'Save changes?', confirmLabel: 'Save', pendingLabel: 'Saving…',
});
const popover = createPopover(dom, { id: 'plugin-options', title: 'Options' });
const html: string = dom.renderHTML(dialog + confirmation + popover);
```

Composition emits closed markup, registers styles only with the supplied DOM instance, and does not mount, invoke handlers, request capabilities or call services. Prefer an isolated collector. `title`, `description` and button/status labels are escaped text; `body` and `footer` are trusted HTML slots. Sanitize untrusted slot content. IDs must be unique within the component's document/tree; namespace them per plugin/view. Avoid mixing collectors from different bundled copies: import both `DOM` and composition functions from the same entry.

```typescript verify
import { mountConfirmationDialog } from '@anikitenko/fdo-sdk/ui';
function mountFrontend(root: HTMLDialogElement) {
  return mountConfirmationDialog(root, {
    onConfirm: async ({ signal }) => {
      // Supply your own frontend operation and honor signal.aborted.
      if (signal.aborted) return;
    },
    onClose: reason => { console.log('Closed:', reason); },
  });
}
```

Mount closed markup after insertion; mounting already-open unowned markup throws `UI_ROOT_OPEN`. Pass the exact root element; mounting never searches the document for component IDs. Internal actions/slots are scoped to their closest component root, so nested markup does not trigger an ancestor's actions. Multiple controllers can coexist with separate roots; popovers require separate connected anchors in the same document. Sharing an anchor concurrently throws `UI_ANCHOR_OWNED`. Remounting replaces only that root's previous controller. Destroy before replacing markup and release controller references. `pagehide` also destroys mounted controllers. Removal alone does not auto-destroy; the host owns rerender lifecycle.

A setup callback for the existing declarative on-load helper may return `controller.destroy` or a cleanup function disposing several controllers/listeners. Serialized callbacks cannot capture imported variables. FDO must provide a frontend module/import map or bundled frontend entry rather than stringify a closure over SDK imports. The example's `mountSdkComponentExample(ui, scope)` explicitly accepts the browser module and exact view scope.

## State and close reasons

`getState()` returns an immutable snapshot: `open`, `destroyed`, `pending`, `error`, `closeReason`. Repeated open/close/destroy calls are idempotent within their valid lifecycle. Opening after destroy throws `UI_DESTROYED`; mount fresh markup/controller. `closeReasons` metadata enumerates every accepted controller reason; `automaticCloseReasons` lists each primitive’s built-in origins. `onStateChange` receives snapshots, while `onClose` fires once per open/close cycle. Callback failures go to deduplicated `onDiagnostic`; without a reporter they use structured `console.error`. Reporter failures cannot block cleanup.

Close reasons are `confirm`, `cancel`, `escape`, `programmatic`, `dismiss`, `destroy`. Generated Cancel buttons emit `cancel`; native Escape emits `escape`; successful `confirm()` emits `confirm`; explicit `close()` and externally closed native dialogs emit `programmatic`; native popover light dismissal emits `dismiss`; teardown of an open component emits `destroy`. Callers can pass another supported reason to `close(reason)` for their own custom footer controls. Closing an already closed component emits no event. Old queued native close/toggle events cannot close a newly opened cycle.

## Dialog accessibility and asynchronous confirmation

Dialogs use native `showModal()` and browser modal focus management. Confirmation uses a native dialog with `role="alertdialog"`. Caller-provided `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy` values are preserved exactly, rather than overwritten or appended. Without explicit relationships, `title` and `description` produce generated label/description IDs. Provide an effective nonempty accessible label. FDO/callers must ensure referenced IDs exist in the same accessible tree. Put dialog label/description targets inside its markup (for example in the body slot): native modality makes outside content inert, and the tested Chrome build omits outside inert text from the dialog name. For a label stored outside the modal, supply its text through `ariaLabel` instead. The SDK does not copy or rewrite caller label relationships.

`initialFocus` may reference a descendant. Otherwise the component selects an owned autofocus element or the generated Cancel button, then the focusable root. Native Escape/cancel is handled explicitly, allowing pending confirmation cancellation. Closing restores the connected opener where focus remains owned by the overlay or the browser restored it; it does not steal focus from another view or an outside dismissal target. `restoreFocus:false` leaves that policy to the caller. All generated buttons have `type="button"`. Custom footers must supply appropriate types, labels and actions.

`confirm()` sets `aria-busy`, displays the status live region, hides previous error feedback and disables owned Confirm buttons. Concurrent calls share one Promise. Successful work closes with `confirm`; failure stays open, returns `false` and presents plain-text error feedback in `role="alert"`. `formatError` can customize that text. Retry clears the previous error. Cancel, Escape, programmatic closure or destroy aborts the operation signal and resolves the controller's Promise `false` promptly, even when work ignores cancellation. Late completion cannot change a later cycle. Aborting cannot undo external side effects: the supplied operation must honor its signal and manage its own transactions/services. No backend callback or capability is supplied by the SDK.

## Popover anchor, overflow and dismissal

Popovers use native `popover="auto"` with a named nonmodal `region`; they do not trap focus. Bind your trigger explicitly, then call `open(anchor)` (or `open()`); mount's `anchor` remains the positioning reference. The component appends its ID to the anchor's existing `aria-controls` tokens and owns `aria-expanded` until cleanup restores the original values. It does not overwrite caller labels/descriptions or implicitly bind anchor clicks.

Placements are `bottom-start` (default), `bottom-end`, `top-start`, `top-end`, relative to physical viewport coordinates. Default `gap` and `viewportPadding` are 8 pixels. Default `overflow:'flip'` flips top/bottom when the alternative provides more space, then shifts into the visual viewport. `overflow:'shift'` keeps the requested side and shifts. Width/height are capped to the available viewport and content scrolls internally. No clipping-container boundary or RTL logical-alignment API is promised in this initial set.

Position is updated on window/visual-viewport resize, captured scroll and observed root/anchor size changes. Call `updatePosition()` after anchor movement without those events, such as an animated transform. A disconnected anchor closes programmatically on the next update. An embedded control can prevent the keydown default to handle Escape first. Otherwise Escape closes the topmost SDK popover with reason `escape`; pointer light dismissal emits `dismiss`. Dismissal preserves focus on an outside target. Independent native auto-popovers in one document obey the browser's auto-popover dismissal rules; simultaneous independent persistent popovers are not promised. Use isolated plugin documents for cross-plugin separation.

## CSS ownership and fallbacks

Stable hooks: `fdo-ui-dialog`, `fdo-ui-confirmation-dialog`, `fdo-ui-popover`; slots carry `data-fdo-slot="body|footer|actions|status|error"`. Body/footer wrappers also expose `fdo-ui__body` and `fdo-ui__footer`. Customize with `options.classes`, `options.style` and these custom properties:

- `--fdo-ui-padding`, `--fdo-ui-color`, `--fdo-ui-background`, `--fdo-ui-border`, `--fdo-ui-radius`, `--fdo-ui-width`
- `--fdo-ui-backdrop`, `--fdo-ui-error-color`

Default styles are scoped through the supplied collector's generated class. Caller style-map entries replace defaults at the same key (nested rules replace that nested rule). The SDK owns visibility, action disabling, `aria-busy`, feedback text and popover's inline positioning/viewport constraints while mounted. It restores caller inline styles and anchor attributes at destruction. Avoid externally mutating these owned fields; change custom properties/classes instead. Do not use a rule that makes a closed dialog/popover always visible.

This initial set requires native dialog/popover APIs. Unsupported primitives fail before attaching listeners, with `UI_NATIVE_DIALOG_REQUIRED` or `UI_NATIVE_POPOVER_REQUIRED`. No silent ARIA-only modal substitute is used. A host may install a reviewed standards-compatible polyfill before mounting, or use the separately documented [custom role dialog pattern](OVERLAY_PATTERNS.md) with its own focus/inert policy. An ARIA role alone does not implement native focus or modality. Native behavior follows the [HTML dialog specification](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element), [popover specification](https://html.spec.whatwg.org/multipage/popover.html) and [WAI-ARIA dialog guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Authoring contract and host integration work

Package exports `@anikitenko/fdo-sdk/ui-components.json` and `@anikitenko/fdo-sdk/ui-components.schema.json` describe identities, compiler-derived editable property types and signatures, HTML child slots, states, events and static-preview requirements. Contract version **1.0.0** uses the same major/minor/patch rules as the existing [authoring contract](AUTHORING_AND_LIVE_UI.md). Unknown majors are unsupported. The build derives metadata/docs from SDK definitions and TypeScript source, without invoking handlers. Metadata readers can recognize a root's `data-fdo-component` and `data-fdo-component-version` without mounting it.

FDO must separately:

- Supply the browser-safe `/ui` module to frontend code via its bundler/import map and obey sandbox/CSP; no browser-global SDK entry is assumed.
- Negotiate/read the component contract and map editable properties/slots to authored source. Source locations, node-to-source mappings, IDs and visual-edit history remain FDO responsibilities.
- Sanitize composed HTML/CSS, simulate preview states in a separate preview surface and avoid invoking mount functions or handlers for static preview.
- Destroy the view's controllers/listeners before replacing markup; isolate plugin documents and verify cross-iframe focus, browser support, capability checks and backend transports.

`npm run verify:pack` installs the real tarball and checks UI root/subpath imports, CJS/ESM parity, declarations, JSON/schema exports, packaged examples and real-Chrome component lifecycle/accessibility tests. The old HTML-string APIs and capability/transport boundaries are unchanged.

## Verified results

The complete SDK suite passes 632 tests across 58 files, with coverage thresholds met. The installed-tarball gate checks both UI module formats, metadata/schema exports, declarations and all packaged examples. Chrome 155.0.8059.80 passes 53 checks: 29 existing overlay checks and 24 component checks, including string-only browser composition without global style injection. These checks do not substitute for FDO iframe/Electron/CSP integration tests.

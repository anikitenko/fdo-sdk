# Inline feedback, async actions, navigation and static previews

These additions use the existing SDK contract: `createX(dom, properties): string` composes HTML and registers CSS with a supplied collector; `mountX(element, options)` installs frontend behavior on an actual connected element. Import from the SDK root or the browser-safe `@anikitenko/fdo-sdk/ui` entry. Existing HTML-string, overlay, toast, capability and transport APIs retain their behavior. Component contract **1.2.0** adds identities, property kinds and preview information within major 1; consumers should ignore unfamiliar identities/optional fields and use the matching published schema when validating the full metadata document.

The [complete example](../examples/16-authoring-components.ts) demonstrates composition, caller-supplied async work, a scoped notification queue and transactional teardown. The [generated API reference](UI_COMPONENT_API.generated.md) contains every option/controller/state type. Text labels/messages are escaped; tab, disclosure, accordion and region bodies are trusted HTML fragments that the caller/host must sanitize. Use a document-unique root ID and reserve its derived child IDs. Nothing executes plugin backend code, acquires a capability or calls a transport implicitly.

## Inline Alert

`createInlineAlert` reuses toast severities (`info`, `success`, `warning`, `error`) and text update shape. It is persistent feedback without a dismiss timer or button. Info/success use a status live region; warning/error use an alert live region. Explicit caller label/description attributes are preserved. `visible:false` composes initially hidden feedback. `mountInlineAlert` provides `update`, `show`, `hide`, `getState` and idempotent `destroy`. Destroy releases ownership while leaving persistent feedback in its current visible/hidden state.

```ts verify
import { DOM, createInlineAlert, mountInlineAlert } from '@anikitenko/fdo-sdk/ui';
const dom = new DOM().collectStylesFrom();
const html: string = dom.renderHTML(createInlineAlert(dom, {
  id: 'settings-validation', title: 'Check your settings', message: 'A server address is required.', variant: 'error',
}));
export function attachValidation(root: HTMLElement) {
  const alert = mountInlineAlert(root);
  alert.update({ message: 'Settings saved.', variant: 'success' });
  return () => alert.destroy();
}
```

Live-region announcement timing still depends on the browser and assistive technology. Keep actionable failures visible, link form validation to the actual input, and avoid repeating identical announcements on every keystroke.

## Toast Region

`createToastRegion(dom, {id, label, body})` composes a labelled section containing caller-composed toast HTML. Composition does not enqueue or display those toasts. `mountToastRegion(root, {maxVisible:3, maxQueued:50})` provides `enqueue(element, options?)`, `dismiss(key)`, `update(key, content)`, `setProgress(key, value, max?)`, `clear`, `getState` and `destroy`.

- Insert toast markup within this region, then pass the actual unmounted toast element to `enqueue`. The SDK does not parse arbitrary strings or discover toasts globally. Nested regions and other component roots cannot be adopted.
- Keys default to the toast element's ID. Duplicate keys/elements and full queues return `false` without replacing an existing notification or deleting caller markup. Explicitly `update` an existing key when appropriate. Missing keys in update/dismiss operations are no-ops.
- `maxVisible` must be a positive integer; `maxQueued` may be zero. Notifications promote in insertion order. Queued toasts remain hidden and start their duration only when visible. Each toast retains its existing hover/focus/visibility pause behavior.
- Entry options reuse `ToastMountOptions`, including duration, callbacks and diagnostics, plus an optional key. User dismissal/timeout reasons remain toast close reasons; `dismiss(key)` closes a visible toast programmatically. A removed queued toast never opened and does not emit a close callback.
- The region owns accepted toast controllers. Do not mount/show those children separately. Closure releases that child's listeners and promotes queued work; `clear()` destroys currently accepted entries. Destroy hides owned toasts, clears their timers/listeners and blocks further enqueues. Caller-owned DOM is retained. Old controllers cannot tear down a new mount.

The region is deliberately placed in normal document flow. Customize its class/style, `--fdo-ui-toast-gap` and `--fdo-ui-region-max-height`; position a caller-owned container as needed. FDO/plugin code still decides where notifications belong, how long to retain rejected/history entries, whether a duplicate represents an update, and how backend notifications are routed. `NotificationManager` and the optional host `window.Notyf` integration are unchanged.

## Async Action Button

`createAsyncActionButton` composes explicit `type="button"` Run/Cancel controls plus separate status/error live regions. Properties include `label`, `pendingLabel`, `successLabel`, `cancelLabel` and initial `disabled`. No action runs during composition or mounting.

`mountAsyncActionButton(root, {onAction, formatError?, onStateChange?, onDiagnostic?})` requires an explicit frontend callback. `run(): Promise<boolean>` coalesces concurrent calls, disables Run, displays Cancel/pending feedback and passes `{signal: AbortSignal}`. Successful completion returns true and shows success feedback. Failure returns false, leaves a plain-text error visible, and permits retry. A formatter failure falls back to a safe message. Retry clears old errors. `reset()` returns to idle; `setDisabled(true)` cancels pending work.

`cancel`, `reset` and `destroy` abort the active signal and settle its Promise false promptly even if the action ignores abort. Late success/failure cannot overwrite another run. Cancellation cannot undo remote side effects: callers must honor the signal and define transaction/retry behavior themselves. Destroy is idempotent, removes only owned listeners and restores the initial native button disabled state and root busy attribute. Rejected observer callbacks use deduplicated structured UI diagnostics; ordinary work failures are displayed as action error feedback.

```ts verify
import { mountAsyncActionButton } from '@anikitenko/fdo-sdk/ui';
export function attachSave(root: HTMLElement, save: (signal: AbortSignal) => Promise<void>) {
  const action = mountAsyncActionButton(root, { onAction: ({ signal }) => save(signal) });
  return () => action.destroy();
}
```

## Tabs

`createTabs` accepts `{id, label, items:[{key,label,body,disabled?}], activeKey?, orientation?}`. Keys must be unique and contain no ASCII whitespace. At least one tab must be enabled; the active tab defaults to the first enabled item. Labels are text; bodies are trusted HTML. Generated tab/panel IDs, `aria-controls`, `aria-labelledby`, selected state, panel visibility and a single tab stop are scoped to the component. Reserve `${rootId}-tab-${key}` and `${rootId}-panel-${key}`.

`mountTabs(root, {activation:'automatic'|'manual'})` defaults to automatic activation. Left/Right move across horizontal tabs; Up/Down handle vertical tabs; disabled tabs are skipped, navigation wraps, Home/End target the first/last enabled tab. Horizontal movement follows visual direction in RTL. Manual activation changes focus first and selects on Enter/Space; automatic activation selects with arrow navigation. Click selects/focuses its tab. Modified or already-prevented events are left to the caller. `select(key, focus=false)` updates the selection explicitly without unexpectedly moving focus by default. `getState` returns the active key; `destroy` removes owned listeners while retaining the selected markup.

Use manual activation when selecting a panel could trigger expensive caller-owned work. The SDK itself never fetches panel content. Recompose/remount to change the item list, orientation or disabled properties. Only the selected panel is exposed; native Tab navigation then reaches panel content. Native buttons remain clickable without mounting, but the ARIA tab-selection/keyboard contract requires the mounted controller. These interactions follow the [WAI-ARIA tabs guidance](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/); application-specific content focus still needs host/browser validation.

## Disclosure and Accordion

`createDisclosure` uses native `<details><summary>` with text title, trusted body and optional initial `open`. Native click, Enter/Space, focus and expanded accessibility semantics work even without mounting. `mountDisclosure` adds `setOpen`, `toggle`, immutable `getState` and state callbacks, synchronizing native toggle events without duplicate notifications. Destroy leaves the native open state and keyboard behavior intact.

`createAccordion` composes labelled, scoped disclosures from `{items:[{key,title,body,open?}], multiple?}`. Default `multiple:false` permits at most one open item, including all closed. Mounting coordinates exclusivity locally; no document-wide native details `name` is used. Without mounting, the disclosures retain independent native behavior. `multiple:true` allows any combination. `mountAccordion` provides `setOpen(key, open)`, immutable open keys and idempotent teardown of its owned child controllers. All summaries remain normal tab stops, operated by native Enter/Space. Do not separately mount accordion-owned disclosures. Reserve `${rootId}-${key}` IDs; sanitize each trusted body.

The disclosure implementation uses native browser semantics rather than a second ARIA-only keyboard framework. The [disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) and [accordion guidance](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) describe the corresponding accessibility concepts. This component does not promise heading-based accordion navigation or optional arrow shortcuts between summaries; use meaningful surrounding headings when the document hierarchy requires them.

## Static component preview gallery

`createComponentGallery(dom, {id?}): string` composes inert visual specimens for every state in `UI_COMPONENT_DEFINITIONS`, plus toast/alert severity variants. `UI_COMPONENT_PREVIEWS` is a deeply frozen, compiler-checked set of SDK-owned serializable cases. Samples use document-unique derived IDs and deterministic incidental text-wrapper IDs. Open overlays are normal-flow visual simulations; gallery dialogs never become modal, popovers never claim the top layer, controls are inert and preview live announcements are disabled. This preview-specific transformation is separate from production composition/mount APIs.

```ts verify
import { DOM, createComponentGallery, UI_COMPONENT_PREVIEWS } from '@anikitenko/fdo-sdk/ui';
const galleryDOM = new DOM().collectStylesFrom();
const html: string = galleryDOM.renderHTML(createComponentGallery(galleryDOM, { id: 'sdk-gallery' }));
const serializedCases: string = JSON.stringify(UI_COMPONENT_PREVIEWS);
void [html, serializedCases];
```

The build publishes:

- `@anikitenko/fdo-sdk/ui-gallery.html`: standalone HTML/CSS gallery with no scripts or external dependencies.
- `@anikitenko/fdo-sdk/ui-previews.json`: version **1.0.0** preview document, with the referenced component contract version and SDK-owned cases.
- `@anikitenko/fdo-sdk/ui-previews.schema.json`: matching JSON Schema.

The gallery is intended for inspection; its inert controls are not an interactive demo. A separate live-browser gate tests the actual mounted components. Tests assert that every declared state has a preview, cases match the published metadata, labels/relationships are valid, CSS is isolated and no backend calls occur. The clean-tarball gate validates package imports, schemas and examples using installed declarations. See the [gallery example](../examples/17-static-component-gallery.ts).

## FDO host changes required

FDO should recognize the six new identities (`fdo.inline-alert`, `fdo.toast-region`, `fdo.async-action-button`, `fdo.tabs`, `fdo.disclosure`, `fdo.accordion`) in component contract 1.2.0. It can consume the preview document/gallery without evaluating handlers. Editable properties and trusted/text/collection slots are in the generated metadata; compiler-derived item properties distinguish text labels, stable keys, boolean state and trusted HTML bodies, and are also described by the exported SDK types.

FDO remains responsible for source locations, node-to-source mappings, source rewrites, visual-edit history, sanitization, capability grants and transport authorization. It must supply the browser-safe UI entry, choose view/container placement, mount behavior only in the live surface, and destroy controllers before replacing markup. In an isolated static preview, simulate states without invoking mount functions, action callbacks or plugin backend code. Validate browser/assistive-technology behavior in FDO's own iframe/CSP environment; SDK Chrome checks cannot substitute for that integration.

# Progress bars and toasts

The SDK's [UI components](UI_COMPONENTS.md) include `createProgressBar`/`mountProgressBar` and `createToast`/`mountToast`, exported from both the package root and the browser-safe `@anikitenko/fdo-sdk/ui` entry. Composition returns HTML strings and registers styles with the supplied DOM collector. Mounting accepts actual connected elements and runs frontend behavior. Neither helper calls a backend service, requests capabilities, injects a global container, nor adds entries to `NotificationManager`. That existing helper remains a backend notification history; `window.Notyf` remains a separate host-provided integration.

```ts verify
import { DOM, createProgressBar, createToast } from '@anikitenko/fdo-sdk/ui';

const dom = new DOM().collectStylesFrom();
const html: string = dom.renderHTML(
  createProgressBar(dom, { id: 'overall', label: 'Overall progress', value: 0 }) +
  createToast(dom, {
    id: 'upload', title: 'Uploading', message: 'Preparing files…',
    progress: { label: 'Files uploaded', value: null },
  })
);
```

After the host inserts the markup, mount each root through its view's element scope:

```ts verify
import { mountToast } from '@anikitenko/fdo-sdk/ui';

export function attachToast(root: HTMLElement) {
  const toast = mountToast(root, { onClose: reason => { console.log(reason); } });
  toast.show();
  toast.setProgress(3, 10);
  toast.update({ message: '3 of 10 files uploaded.' });
  // Only the caller decides what successful completion means.
  toast.setProgress(10);
  toast.update({ title: 'Upload complete', message: 'All files uploaded.', variant: 'success' });
  return () => toast.destroy();
}
```

The [complete example](../examples/15-feedback-components.ts) separates serializable composition from frontend mounting and updates. The application supplies the work, cancellation, retries and any backend transport explicitly.

## Progress semantics

Progress bars use native `<progress>`. Omitted/null `value` means indeterminate; zero is determinate. Default `max` is 100. `setValue(value, max?)` retains the current max when omitted; finite numeric values must lie in `[0, max]`, and max must be finite and positive. Invalid updates throw `UI_PROGRESS_INVALID` before modifying the element. A non-empty `label` or `ariaLabelledBy` is required. Labels are plain text; caller-provided label/description relationships are retained. External referenced labels must exist in the same document. Native accessibility exposes value/range without manually duplicating ARIA value attributes. Do not remove the native appearance without replacing its visual affordance.

`getState()` returns an immutable snapshot of value, max and destroyed status. `destroy()` is idempotent; calls through the old controller cannot mutate a remounted component. Destruction leaves the last progress value visible. Native progress remains meaningful without mounting; browsers with limited native styling use their standard progress presentation. No animation is added by the SDK.

## Toast semantics and accessibility

Toasts start hidden. `show()` reveals one instance without moving focus or replacing other notifications. Repeated show while open is a no-op. `close(reason?)` hides it; default reason is `programmatic`. The dismiss button emits `dismiss`, an elapsed timeout emits `timeout`, and destruction of an open toast emits `destroy`. Closed or already destroyed instances do not emit another close event. `destroy()` clears timers/listeners and destroys owned progress. It hides the toast but leaves markup for the view owner to remove. Remounting replaces only the same root's previous owner. Destroy controllers before removing or replacing view markup.

`info` (default) and `success` use `role="status"` (polite); `warning` and `error` use `role="alert"` (assertive). Both use atomic live announcements. Screen reader announcement timing depends on the browser/assistive technology; the text remains visible and a labelled dismiss button is always provided. Toasts are nonmodal: no focus trap, Escape interception, document-wide key handlers or focus restoration policy is installed. Keyboard users reach the dismiss button through normal tab order. Focus outside a toast is left alone. Closing a toast with focus inside releases that focus before hiding it. Important errors should remain visible or be reflected in persistent page feedback; avoid transient toasts as the sole record of an actionable failure.

Title/message and dismiss labels are escaped text, never HTML slots. `update({title?, message?, variant?})` uses `textContent`, preserves explicit ARIA label/description attributes, and does not reset the timer. `getState()` reports open, destroyed, paused, variant, closeReason and optional progress. Asynchronous state/close callback failures are reported as deduplicated `UI_CALLBACK_FAILED` diagnostics through `onDiagnostic`, matching other UI components. Diagnostic callback failures do not interrupt cleanup.

## Timing and progress inside toasts

Default `duration: 0` keeps a toast visible until explicitly dismissed. An optional positive duration is milliseconds of unpaused visibility (maximum 2147483647). Hover, focus within the toast and a hidden document each pause the timer. Explicit `pause()`/`resume()` control an additional independent pause reason; resume never overrides hover, focus or page visibility. Remaining time is retained, rather than restarting after each pause. Reopening after closure starts a fresh duration. No timer is scheduled for persistent toasts.

Include `progress: {label, value?, max?, options?}` at composition time. The child ID is `${toastId}-progress`; reserve it as well as the toast ID in your document. `setProgress(value, max?)` updates that owned native progress bar. Calling it without composed progress throws `UI_TOAST_PROGRESS_MISSING`; it never inserts unexpected markup. Reaching max does not dismiss a toast, switch its severity or change its message. Toast duration and progress are independent; use manual dismissal for work that must remain visible until completion. A countdown animation is not implied.

## Styling, placement and host responsibilities

Stable classes are `fdo-ui-progress-bar`, `fdo-ui-toast`, `fdo-ui-toast__title`, `fdo-ui-toast__message`, `fdo-ui-toast__progress` and `fdo-ui-toast__dismiss`. Toast roots expose `data-fdo-variant="info|success|warning|error"`. Customize through `options.classes`, recursive `options.style`, `--fdo-ui-progress-width`, `--fdo-ui-progress-height`, `--fdo-ui-progress-color`, and the existing `--fdo-ui-padding`, `--fdo-ui-background`, `--fdo-ui-color`, `--fdo-ui-border`, `--fdo-ui-radius`, `--fdo-ui-width`; variant borders use `--fdo-ui-info-color`, `--fdo-ui-success-color`, `--fdo-ui-warning-color` and `--fdo-ui-error-color`. Scoped CSS belongs to the supplied DOM collector and must be emitted with `renderHTML`. Do not override hidden visibility, the native value/max attributes or the generated component structure while mounted.

The SDK renders toasts in normal document flow. The optional [Toast Region](AUTHORING_COMPONENTS.md) now provides a scoped bounded queue and duplicate-key rejection for caller-composed toast elements. FDO or the plugin owns the notification stack/container, placement, z-index, overflow/scroll policy, queue policy and history, using the optional Toast Region when appropriate. A host can place a toast container in a modal's DOM subtree when notifications must appear above that modal; ordinary document content cannot paint above the native dialog top layer merely by increasing z-index. No global portal or top-layer takeover is attempted.

Authoring contract **1.1.0** adds `fdo.progress-bar` and `fdo.toast` without changing existing signatures or identities. Metadata/schema exports describe typed properties, text/component slots, variants, child identity, states, callbacks and close reasons. Readers should ignore unknown component identities and optional fields within a supported major version. FDO must map properties back to source, preserve visual-edit history, validate/sanitize composition and simulate preview visibility/progress without mounting or executing handlers. Backend notification routing, cancellation semantics and browser/assistive-technology validation inside FDO remain host responsibilities.

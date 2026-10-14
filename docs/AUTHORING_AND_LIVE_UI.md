# Plugin authoring and Live UI contract

DOM builders return **HTML strings**. `createClassFromStyle` returns a **class-name string**; `createStyleKeyframe` returns an **animation-name string**. `defineRenderOnLoad` and `defineRenderOnLoadActions` return **frontend source descriptors**. Actual `Element` objects exist only in frontend code after the browser parses markup. Do not call `appendChild` on a builder result or pass a class-name string as HTML children.

`DOMText` escapes text. `DOMNested`, tables, buttons, links and generic `createElement` accept trusted HTML strings; sanitize untrusted fragments before composition. Attribute values are escaped, but URL schemes and executable props require host validation. Legacy inline function attributes remain serialized for compatibility; use `createStaticButton` or explicit `createElement('button', { type: 'button' }, ...)` and declarative frontend bindings for portable browser behavior.

## Style ownership

The default API retains its legacy behavior: all DOM instances register into the shared Goober sheet; the next `renderHTML` drains that sheet. Reusing a previously returned class after draining requires registering its style again. Unattached helpers can therefore leak CSS across plugins in one process. This mode provides no isolation guarantee.

For isolated views, attach all helpers **before** registering styles or composing elements:

```typescript verify
import { DOM, DOMText, DOMButton, DOMStyleMap } from '@anikitenko/fdo-sdk';
const text = new DOMText();
const buttons = new DOMButton();
const collector = new DOM().collectStylesFrom(text, buttons);
const legacy: Record<string, string> = { color: 'white' };
const styles: DOMStyleMap = {
  ...legacy,
  '--accent': 'blue',
  '&:hover, &:focus-visible': { color: 'red !important' },
  '@media (min-width: 600px)': { padding: '1rem' },
  '&::backdrop': { background: 'rgb(0 0 0 / 50%)' },
};
const content = text.createPText('Ready', { style: styles }, 'status');
const html = collector.renderHTML(content);
```

The collector and attached helpers share one sheet. `renderHTML` emits its full deduplicated CSS on every render and retains it for cached markup and interleaved renders. A fresh collector starts empty. Release the collector/helpers when the view is discarded; create fresh ones if style variants should stop accumulating. Attach every helper contributing styled markup; the SDK cannot infer an owner from a plain string. Late attachment and moving populated explicit owners throw errors with `code` and `remediation`. Failed attachment does not move any helper. Styles remain scoped by Goober selectors, but global at-rules such as `@font-face`/`@import` are not a security boundary. Put independent plugins in separate host documents/iframes.

`DOMOptions` provides recursive authoring options; `DOM.DEFAULT_OPTIONS.style` keeps its original flat record type for existing readers. Style maps support string/numeric declarations, null/undefined omissions, recursive nested selectors and conditional rules. Numbers are emitted verbatim: provide units where CSS requires them. Custom properties, selector lists, `!important`, media/supports queries and `::backdrop` are covered by real-Goober tests. Arrays/functions are not style-map declarations.

## Metadata exports and compatibility

The legacy `@anikitenko/fdo-sdk/dom-metadata.json` export preserves the top-level array, class/method/parameter records, JSDoc returns and examples. Additive `returnType` and parameter `rest` fields describe compiler-derived signatures. Generated example strings remove JSDoc `<caption>` annotations and qualify standalone helper calls so they compile directly.

Two additive exports support generators and Live UI consumers:

- `@anikitenko/fdo-sdk/dom-authoring-contract.json`
- `@anikitenko/fdo-sdk/dom-authoring-contract.schema.json`

The root package offers the original CommonJS runtime and an additive native ESM façade over the same exports. Use `require(...)` for metadata from CommonJS or JSON imports appropriate to your compiler/runtime. These artifacts ship in the package, are generated during build, and need no Electron host. The release fixture resolves all three through package exports, validates the schema, compares every public DOM constructor/method with shipped declarations and compiles all generated examples against the installed tarball.

The authoring contract starts at **1.0.0**, independently of the SDK package version. Public versions use `x.x.x`: major changes alter/remove existing fields or semantics, minor changes add optional fields/classes/methods/value kinds, patch changes correct examples/descriptions without changing semantics. Readers must ignore unknown optional fields and reject unsupported major versions. A consumer must check a method's preview constraints and treat unknown methods or return kinds as unsupported. Older `"1"` handshake/fixture contracts are unchanged; this document does not silently reinterpret their version policy.

## Frontend lifecycle

`defineRenderOnLoadActions` extends the existing source generator. Give each frontend view a unique stable `lifecycleKey`; identical options otherwise derive the same implicit key. Reinitializing that key disposes only its own listeners/setup. Different keys do not remove one another's listeners. Selectors are document-scoped: use unique root-scoped selectors when multiple views share a document.

`setup` can return cleanup, or a Promise resolving to cleanup. Bindings install immediately; if asynchronous setup rejects, they roll back. Cleanup arriving after teardown is invoked once. Synchronous setup/binding failures roll back installed listeners and cleanup. Setup must unwind resources itself if it throws before returning cleanup. The SDK cannot recover those undisclosed resources. Keep synchronous setup until asynchronous readiness is needed.

Before replacing markup, call `disposeRenderOnLoadActions(window, lifecycleKey)` in the frontend; `pagehide` also disposes. A host that evaluates source directly can use the stable cleanup registry: `window[Symbol.for('fdo.renderOnLoad.cleanup')]?.get(lifecycleKey)?.()`. The generated IIFE also returns cleanup to evaluators that retain completion values. Plain `defineRenderOnLoad` string/function sources retain their original contract and do not automatically acquire cleanup.

Functions are serialized, so setup, handlers and `onDiagnostic` must be self-contained: no closures over plugin objects/imports/backend state. `onDiagnostic` receives `code`, `phase`, `message`, `remediation` and optional bounded `detail`; each distinct failure is reported once per initialization. Without a reporter, failures use `console.error`; successful production setup is silent. Strict mode throws synchronous initialization errors after rollback. Both synchronous and asynchronous handler failures use `ONLOAD_HANDLER_FAILED`, without creating unhandled Promise rejections. Reporter exceptions cannot block cleanup. Use separate explicit frontend `UI_MESSAGE` requests for backend work; host capabilities and transport validation are unchanged.

## Bidirectional editor responsibilities

The SDK describes signatures, return kinds, trusted HTML composition, side effects, style ownership and conditional static-preview eligibility. This is an authoring contract, not an executable plugin interpreter. Preview eligibility applies only to validated SDK composition with literal safe arguments and an isolated sheet. Never execute arbitrary plugin methods, constructors, backend code, on-load scripts, getters, spread expressions or callbacks for static preview. Strip host script placeholders and inline handlers; sanitize HTML and CSS before insertion.

FDO must parse and track authored source, map editor nodes to source ranges, retain unsupported expressions/comments and apply validated source edits without losing author intent. Random SDK IDs are not stable source identities; persist editor IDs separately or author explicit IDs. The host must implement that mapping and round-trip validation, provide accurate published declarations/metadata to its AI/editor, and reject unsupported contract majors. No replacement rendering framework or backend preview execution is introduced here.

## Release checks

`npm run verify:pack` retains the pack-list check and runs a build, actual pack, clean tarball install, public import/declaration/schema/example checks and headless Chrome checks. It fails if a real browser is unavailable; set `FDO_CHROME_PATH` to Chrome/Chromium. It uses a temporary browser profile, CDP pipes and a temporary consumer fixture, not a user's browsing session. The fixture installs Node declarations as an authoring dev dependency, ignores dependency install scripts and never initializes an FDO plugin/backend. See [overlay patterns](OVERLAY_PATTERNS.md) and the [compatibility report](AUTHORING_COMPATIBILITY.md).

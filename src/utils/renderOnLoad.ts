import {
    RenderOnLoadActionBinding,
    RenderOnLoadActionBindingsModuleOptions,
    RenderOnLoadActionHandler,
    RenderOnLoadHint,
    RenderOnLoadTemplate,
    RenderOnLoadTemplateListOptions,
    RenderOnLoadModule,
    RenderOnLoadOutput,
    RenderOnLoadSource,
} from "../types";

const DEFAULT_RENDER_ON_LOAD_SOURCE = "() => {}";

const RENDER_ON_LOAD_TEMPLATES: ReadonlyArray<RenderOnLoadTemplate> = Object.freeze([
    {
        id: "runtime-noop",
        label: "Runtime no-op",
        description: "Smallest valid runtime on-load source.",
        context: "runtime-source",
        language: "javascript",
        source: "(() => {})();",
    },
    {
        id: "runtime-ui-message",
        label: "Runtime UI_MESSAGE call",
        description: "Bind a click handler and call backend UI_MESSAGE handler through the host bridge.",
        context: "runtime-source",
        language: "javascript",
        source: `(() => {
  const button = document.getElementById("run-action");
  if (!button) return;
  button.addEventListener("click", async () => {
    const response = await window.createBackendReq("UI_MESSAGE", {
      handler: "plugin.v1.runAction",
      content: {},
    });
    console.log("UI_MESSAGE response", response);
  });
})();`,
    },
    {
        id: "method-define-render-on-load",
        label: "Method defineRenderOnLoad",
        description: "Plugin method template using defineRenderOnLoad(() => ...).",
        context: "plugin-method",
        language: "typescript",
        source: `renderOnLoad() {
  return defineRenderOnLoad(() => {
    const button = document.getElementById("run-action");
    if (!button) return;
    button.addEventListener("click", async () => {
      const response = await window.createBackendReq("UI_MESSAGE", {
        handler: "plugin.v1.runAction",
        content: {},
      });
      console.log(response);
    });
  }, {
    language: "typescript",
  });
}`,
    },
    {
        id: "method-define-render-on-load-actions",
        label: "Method defineRenderOnLoadActions",
        description: "Plugin method template using declarative action bindings.",
        context: "plugin-method",
        language: "typescript",
        source: `renderOnLoad() {
  return defineRenderOnLoadActions({
    handlers: {
      run: async () => {
        await window.createBackendReq("UI_MESSAGE", {
          handler: "plugin.v1.runAction",
          content: {},
        });
      },
    },
    bindings: [
      {
        selector: "#run-action",
        event: "click",
        handler: "run",
      },
    ],
    strict: true,
  });
}`,
    },
]);

function isRenderOnLoadFunction(value: unknown): value is () => void {
    return typeof value === "function";
}

function resolveSourceExpression(source: RenderOnLoadSource): string {
    return typeof source === "string" ? source : source.toString();
}

function resolveActionHandlerExpression(handler: RenderOnLoadActionHandler): string {
    return typeof handler === "string" ? handler.trim() : handler.toString();
}

function normalizeActionBinding(binding: RenderOnLoadActionBinding): RenderOnLoadActionBinding {
    const selector = String(binding.selector || "").trim();
    const event = String(binding.event || "").trim();
    const handler = String(binding.handler || "").trim();

    if (!selector) {
        throw new Error("Render-on-load action binding selector must be a non-empty string.");
    }

    if (!event) {
        throw new Error(`Render-on-load action binding for selector "${selector}" must define a non-empty event.`);
    }

    if (!handler) {
        throw new Error(`Render-on-load action binding for selector "${selector}" must define a non-empty handler id.`);
    }

    return {
        selector,
        event,
        handler,
        preventDefault: Boolean(binding.preventDefault),
        stopPropagation: Boolean(binding.stopPropagation),
        once: Boolean(binding.once),
        passive: Boolean(binding.passive),
        capture: Boolean(binding.capture),
        required: binding.required !== false,
    };
}

function normalizeActionHandlers(handlers: Record<string, RenderOnLoadActionHandler>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [handlerIdRaw, handlerSource] of Object.entries(handlers)) {
        const handlerId = String(handlerIdRaw || "").trim();
        if (!handlerId) {
            throw new Error("Render-on-load action handlers must use non-empty handler ids.");
        }

        const expression = resolveActionHandlerExpression(handlerSource);
        if (!expression) {
            throw new Error(`Render-on-load action handler "${handlerId}" must provide a non-empty function source.`);
        }

        normalized[handlerId] = expression;
    }

    if (Object.keys(normalized).length === 0) {
        throw new Error("Render-on-load action helper requires at least one handler.");
    }

    return normalized;
}

export function isRenderOnLoadModule(value: unknown): value is RenderOnLoadModule {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value as RenderOnLoadModule;
    return typeof candidate.source === "string" || isRenderOnLoadFunction(candidate.source);
}

export function defineRenderOnLoad(
    source: RenderOnLoadSource,
    options: Omit<RenderOnLoadModule, "source"> = {}
): RenderOnLoadModule {
    return {
        source,
        ...options,
    };
}

export function createRenderOnLoadActionsSource(options: RenderOnLoadActionBindingsModuleOptions): string {
    const strict = options.strict === true;
    const normalizedHandlers = normalizeActionHandlers(options.handlers);
    const normalizedBindings = (Array.isArray(options.bindings) ? options.bindings : [])
        .map(normalizeActionBinding);

    if (normalizedBindings.length === 0) {
        throw new Error("Render-on-load action helper requires at least one binding.");
    }

    for (const binding of normalizedBindings) {
        if (!normalizedHandlers[binding.handler]) {
            throw new Error(
                `Render-on-load action binding "${binding.selector}" references unknown handler "${binding.handler}".`
            );
        }
    }

    const handlersSource = Object.entries(normalizedHandlers)
        .map(([handlerId, expression]) => `${JSON.stringify(handlerId)}: ${expression}`)
        .join(",\n    ");
    const setupExpression = options.setup ? resolveSourceExpression(options.setup as RenderOnLoadSource) : "null";
    const bindingsJson = JSON.stringify(normalizedBindings);
    const lifecycleKey = options.lifecycleKey ?? JSON.stringify([normalizedBindings, normalizedHandlers]);
    const reporter = options.onDiagnostic ? resolveSourceExpression(options.onDiagnostic as RenderOnLoadSource) : "null";

    return `(() => {
  const __fdoStrict = ${strict ? "true" : "false"};
  const __fdoHandlers = { ${handlersSource} };
  const __fdoBindings = ${bindingsJson};
  const __fdoKey = ${JSON.stringify(lifecycleKey)};
  const __fdoRegistrySymbol = Symbol.for("fdo.renderOnLoad.cleanup");
  const __fdoRegistry = window[__fdoRegistrySymbol] || (window[__fdoRegistrySymbol] = new Map());
  const __fdoPrevious = __fdoRegistry.get(__fdoKey);
  if (__fdoPrevious) __fdoPrevious();
  const __fdoReporter = ${reporter};
  const __fdoReported = new Set();
  const __fdoReport = (code, phase, message, error) => {
    const detail = error instanceof Error ? error.message : String(error ?? "");
    const diagnostic = { code, phase, message, ...(detail ? { detail: detail.slice(0, 500) } : {}), remediation: "Check selectors, self-contained handlers and setup cleanup; dispose this lifecycle key before replacing markup." };
    const identity = code + message;
    if (__fdoReported.has(identity)) return;
    __fdoReported.add(identity);
    try {
      if (typeof __fdoReporter === "function") {
        const result = __fdoReporter(diagnostic);
        if (result && typeof result.then === "function") Promise.resolve(result).catch(() => {});
      } else if (typeof console !== "undefined") console.error(message, error || diagnostic);
    } catch (_) { /* A reporter cannot break cleanup or create unhandled rejections. */ }
  };
  const __fdoRunCleanup = (cleanup) => {
    try {
      const result = cleanup();
      if (result && typeof result.then === "function") Promise.resolve(result).catch((error) =>
        __fdoReport("ONLOAD_CLEANUP_FAILED", "cleanup", "[FDO:onLoad] Setup cleanup failed.", error));
    } catch (error) { __fdoReport("ONLOAD_CLEANUP_FAILED", "cleanup", "[FDO:onLoad] Setup cleanup failed.", error); }
  };
  let __fdoDisposed = false;
  let __fdoSetupCleanup;
  const __fdoListeners = [];
  const __fdoCleanup = () => {
    if (__fdoDisposed) return;
    __fdoDisposed = true;
    for (const [element, event, listener, capture] of __fdoListeners) {
      try { element.removeEventListener(event, listener, capture); }
      catch (error) { __fdoReport("ONLOAD_CLEANUP_FAILED", "cleanup", "[FDO:onLoad] Listener cleanup failed.", error); }
    }
    if (typeof window.removeEventListener === "function") window.removeEventListener("pagehide", __fdoCleanup);
    if (__fdoRegistry.get(__fdoKey) === __fdoCleanup) __fdoRegistry.delete(__fdoKey);
    if (__fdoSetupCleanup) __fdoRunCleanup(__fdoSetupCleanup);
  };
  __fdoRegistry.set(__fdoKey, __fdoCleanup);
  if (typeof window.addEventListener === "function") window.addEventListener("pagehide", __fdoCleanup);
  const __fdoAcceptCleanup = (result) => {
    if (typeof result !== "function") return;
    if (__fdoDisposed) {
      __fdoRunCleanup(result);
    } else __fdoSetupCleanup = result;
  };
  const __fdoSetupFailed = (error) => {
    __fdoCleanup();
    __fdoReport("ONLOAD_SETUP_FAILED", "setup", "[FDO:onLoad] Setup function failed.", error);
  };
  let __fdoPhase = "setup";
  try {
    const __fdoSetup = ${setupExpression};
    if (typeof __fdoSetup === "function") {
      const result = __fdoSetup();
      if (result && typeof result.then === "function") Promise.resolve(result).then(__fdoAcceptCleanup, __fdoSetupFailed);
      else __fdoAcceptCleanup(result);
    }
    __fdoPhase = "binding";
    for (const binding of __fdoBindings) {
      const elements = Array.from(document.querySelectorAll(binding.selector));
      if (elements.length === 0 && binding.required) {
        const message = \`[FDO:onLoad] No elements matched selector "\${binding.selector}" for event "\${binding.event}".\`;
        __fdoReport("ONLOAD_SELECTOR_MISSING", "binding", message);
        if (__fdoStrict) throw new Error(message);
      }
      for (const element of elements) {
        const listener = (event) => {
          if (__fdoDisposed) return;
          if (binding.preventDefault) event.preventDefault();
          if (binding.stopPropagation) event.stopPropagation();
          try {
            const result = __fdoHandlers[binding.handler]({ event, element, window, document });
            if (result && typeof result.then === "function") Promise.resolve(result).catch((error) =>
              __fdoReport("ONLOAD_HANDLER_FAILED", "handler", \`[FDO:onLoad] Action handler "\${binding.handler}" failed.\`, error));
          } catch (error) {
            __fdoReport("ONLOAD_HANDLER_FAILED", "handler", \`[FDO:onLoad] Action handler "\${binding.handler}" failed.\`, error);
          }
        };
        element.addEventListener(binding.event, listener, { capture: binding.capture, once: binding.once, passive: binding.passive });
        __fdoListeners.push([element, binding.event, listener, Boolean(binding.capture)]);
      }
    }
  } catch (error) {
    __fdoCleanup();
    __fdoReport("ONLOAD_INITIALIZATION_FAILED", __fdoPhase, "[FDO:onLoad] Initialization failed.", error);
    if (__fdoStrict) throw error;
  }
  return __fdoCleanup;
})();`;
}

/** Dispose only the named frontend instance before rerender/teardown. */
export function disposeRenderOnLoadActions(target: Window, lifecycleKey: string): void {
    const registry = (target as unknown as Record<symbol, Map<string, () => void>>)[Symbol.for("fdo.renderOnLoad.cleanup")];
    registry?.get(lifecycleKey)?.();
}

export function defineRenderOnLoadActions(options: RenderOnLoadActionBindingsModuleOptions): RenderOnLoadModule {
    return defineRenderOnLoad(createRenderOnLoadActionsSource(options), {
        language: options.language ?? "typescript",
        hints: options.hints,
        description: options.description
            ?? "Declarative renderOnLoad action bindings generated by defineRenderOnLoadActions(...).",
    });
}

export function resolveRenderOnLoadSource(output: RenderOnLoadOutput): string {
    if (typeof output === "string") {
        return output;
    }

    if (isRenderOnLoadFunction(output)) {
        return output.toString();
    }

    if (isRenderOnLoadModule(output)) {
        return resolveRenderOnLoadSource(output.source);
    }

    throw new Error(
        "Method 'renderOnLoad' must return a synchronous string, function, or defineRenderOnLoad(...) module."
    );
}

export function createNoopRenderOnLoadSource(): string {
    return DEFAULT_RENDER_ON_LOAD_SOURCE;
}

function cloneRenderOnLoadTemplate(template: RenderOnLoadTemplate): RenderOnLoadTemplate {
    return {
        id: template.id,
        label: template.label,
        description: template.description,
        context: template.context,
        language: template.language,
        source: template.source,
    };
}

export function listRenderOnLoadTemplates(options: RenderOnLoadTemplateListOptions = {}): RenderOnLoadTemplate[] {
    const context = options.context;
    return RENDER_ON_LOAD_TEMPLATES
        .filter((template) => !context || template.context === context)
        .map((template) => cloneRenderOnLoadTemplate(template));
}

export function getRenderOnLoadTemplate(id: string): RenderOnLoadTemplate | null {
    const normalizedId = String(id ?? "").trim();
    if (!normalizedId) {
        return null;
    }

    const template = RENDER_ON_LOAD_TEMPLATES.find((entry) => entry.id === normalizedId);
    return template ? cloneRenderOnLoadTemplate(template) : null;
}

export function getRenderOnLoadMonacoTypeDefinitions(): string {
    return [
        "declare namespace FDOOnLoad {",
        "  type BackendReq = (type: string, data?: unknown) => Promise<unknown>;",
        "  type WaitForElement = (selector: string, callback: (element: Element) => void, timeout?: number) => void;",
        "  interface Context {",
        "    window: Window;",
        "    document: Document;",
        "    createBackendReq: BackendReq;",
        "    waitForElement: WaitForElement;",
        "    addGlobalEventListener: Window[\"addGlobalEventListener\"];",
        "    removeGlobalEventListener: Window[\"removeGlobalEventListener\"];",
        "    executeInjectedScript: Window[\"executeInjectedScript\"];",
        "    applyClassToSelector: Window[\"applyClassToSelector\"];",
        "    Notyf?: Window[\"Notyf\"];",
        "    hljs?: Window[\"hljs\"];",
        "    ace?: Window[\"ace\"];",
        "  }",
        "}",
    ].join("\n");
}

export function getRenderOnLoadMonacoHints(): RenderOnLoadHint[] {
    return [
        {
            kind: "snippet",
            label: "UI_MESSAGE handler request",
            insertText: "const response = await window.createBackendReq(\"UI_MESSAGE\", { handler: \"${1:handler.id}\", content: ${2:{}} });",
            detail: "Call a backend handler through UI_MESSAGE bridge.",
            documentation: "Use host-validated UI_MESSAGE bridge to communicate with backend handlers.",
        },
        {
            kind: "snippet",
            label: "waitForElement helper",
            insertText: "window.waitForElement(\"${1:#selector}\", (element) => {\\n  ${2:// ...}\\n});",
            detail: "Wait until selector appears in iframe DOM.",
            documentation: "Use this helper instead of tight polling loops in on-load scripts.",
        },
        {
            kind: "snippet",
            label: "Notyf success toast",
            insertText: "const notifier = new window.Notyf({ duration: 2500 });\\nnotifier.success(\"${1:Done}\");",
            detail: "Show user feedback toast.",
        },
        {
            kind: "snippet",
            label: "Action binding pattern",
            insertText: "document.querySelector(\"${1:#button}\")?.addEventListener(\"${2:click}\", (event) => {\\n  ${3:// ...}\\n});",
            detail: "Bind a DOM event handler in on-load runtime.",
            documentation: "For plugin TypeScript authoring, prefer SDK helper defineRenderOnLoadActions(...) over hand-written listener wiring.",
        },
    ];
}

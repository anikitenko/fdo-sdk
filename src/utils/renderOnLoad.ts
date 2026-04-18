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
    const setupExpression = options.setup ? resolveSourceExpression(options.setup) : "null";
    const bindingsJson = JSON.stringify(normalizedBindings);

    return `(() => {
  const __fdoStrict = ${strict ? "true" : "false"};
  const __fdoHandlers = {
    ${handlersSource}
  };
  const __fdoBindings = ${bindingsJson};
  const __fdoWarn = (message) => {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(message);
    }
  };
  const __fdoError = (message, error) => {
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(message, error);
    }
  };
  const __fdoHandleFailure = (message, error) => {
    if (__fdoStrict) {
      const details = error instanceof Error ? error.message : String(error ?? "");
      throw new Error(details ? \`\${message} \${details}\` : message);
    }
    __fdoError(message, error);
  };
  const __fdoInvokeHandler = (handlerId, event, element) => {
    const handler = __fdoHandlers[handlerId];
    if (typeof handler !== "function") {
      __fdoHandleFailure(\`[FDO:onLoad] Unknown action handler "\${handlerId}".\`, null);
      return;
    }
    try {
      const result = handler({ event, element, window, document });
      if (result && typeof result.then === "function") {
        result.catch((error) => {
          __fdoHandleFailure(\`[FDO:onLoad] Action handler "\${handlerId}" rejected.\`, error);
        });
      }
    } catch (error) {
      __fdoHandleFailure(\`[FDO:onLoad] Action handler "\${handlerId}" failed.\`, error);
    }
  };
  const __fdoSetup = ${setupExpression};
  if (__fdoSetup !== null && __fdoSetup !== undefined) {
    if (typeof __fdoSetup === "function") {
      try {
        const setupResult = __fdoSetup();
        if (setupResult && typeof setupResult.then === "function") {
          setupResult.catch((error) => __fdoHandleFailure("[FDO:onLoad] Setup function rejected.", error));
        }
      } catch (error) {
        __fdoHandleFailure("[FDO:onLoad] Setup function failed.", error);
      }
    } else {
      __fdoWarn("[FDO:onLoad] Setup value is not a function and was ignored.");
    }
  }
  for (const binding of __fdoBindings) {
    const elements = Array.from(document.querySelectorAll(binding.selector));
    if (elements.length === 0) {
      if (binding.required) {
        const message = \`[FDO:onLoad] No elements matched selector "\${binding.selector}" for event "\${binding.event}".\`;
        if (__fdoStrict) {
          throw new Error(message);
        }
        __fdoWarn(message);
      }
      continue;
    }
    const listenerOptions = {
      capture: Boolean(binding.capture),
      once: Boolean(binding.once),
      passive: Boolean(binding.passive),
    };
    for (const element of elements) {
      element.addEventListener(binding.event, (event) => {
        if (binding.preventDefault) {
          event.preventDefault();
        }
        if (binding.stopPropagation) {
          event.stopPropagation();
        }
        __fdoInvokeHandler(binding.handler, event, element);
      }, listenerOptions);
    }
  }
})();`;
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

import {
    createNoopRenderOnLoadSource,
    createRenderOnLoadActionsSource,
    defineRenderOnLoad,
    defineRenderOnLoadActions,
    getRenderOnLoadTemplate,
    getRenderOnLoadMonacoHints,
    getRenderOnLoadMonacoTypeDefinitions,
    isRenderOnLoadModule,
    listRenderOnLoadTemplates,
    resolveRenderOnLoadSource,
} from "../../src/utils/renderOnLoad";

describe("renderOnLoad helpers", () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    afterEach(() => {
        if (originalWindow) {
            globalThis.window = originalWindow;
        } else {
            delete (globalThis as { window?: Window }).window;
        }

        if (originalDocument) {
            globalThis.document = originalDocument;
        } else {
            delete (globalThis as { document?: Document }).document;
        }
    });

    test("creates default no-op source", () => {
        expect(createNoopRenderOnLoadSource()).toBe("() => {}");
    });

    test("defines module from string source", () => {
        const module = defineRenderOnLoad("() => console.log('ready')");
        expect(isRenderOnLoadModule(module)).toBe(true);
        expect(resolveRenderOnLoadSource(module)).toBe("() => console.log('ready')");
    });

    test("defines module from function source", () => {
        const module = defineRenderOnLoad(() => {
            const root = document.getElementById("root");
            if (root) {
                root.textContent = "ok";
            }
        });

        const source = resolveRenderOnLoadSource(module);
        expect(source).toContain("document.getElementById(\"root\")");
    });

    test("generates declarative action-binding module source", () => {
        const module = defineRenderOnLoadActions({
            handlers: {
                save: ({ element }: any) => {
                    (window as any).__saveCalls = ((window as any).__saveCalls ?? 0) + 1;
                    element.dataset.bound = "true";
                },
            },
            bindings: [
                {
                    selector: "#save-btn",
                    event: "click",
                    handler: "save",
                    preventDefault: true,
                    stopPropagation: true,
                },
            ],
        });

        const source = resolveRenderOnLoadSource(module);
        expect(source).toContain("__fdoBindings");
        expect(source).toContain("\"#save-btn\"");
        expect(source).toContain("\"save\":");
        expect(source).toContain("addEventListener");
    });

    test("binds and invokes declarative actions at runtime", () => {
        const listeners: Array<{ callback: (event: any) => void }> = [];
        const fakeElement = {
            dataset: {} as Record<string, string>,
            addEventListener: vi.fn((_event: string, callback: (event: any) => void) => {
                listeners.push({ callback });
            }),
        };

        globalThis.window = { __saveCalls: 0 } as unknown as Window;
        globalThis.document = {
            querySelectorAll: vi.fn().mockReturnValue([fakeElement]),
        } as unknown as Document;

        const source = createRenderOnLoadActionsSource({
            setup: () => {
                (window as any).__setupCalls = ((window as any).__setupCalls ?? 0) + 1;
            },
            handlers: {
                save: ({ element }: any) => {
                    (window as any).__saveCalls = ((window as any).__saveCalls ?? 0) + 1;
                    element.dataset.bound = "true";
                },
            },
            bindings: [{ selector: "#save-btn", event: "click", handler: "save" }],
        });

        new Function(source)();

        expect((window as any).__setupCalls).toBe(1);
        expect(fakeElement.addEventListener).toHaveBeenCalledTimes(1);
        expect(listeners).toHaveLength(1);

        const event = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
        };
        listeners[0].callback(event);

        expect((window as any).__saveCalls).toBe(1);
        expect(fakeElement.dataset.bound).toBe("true");
    });

    test("throws when binding references an unknown handler", () => {
        expect(() => createRenderOnLoadActionsSource({
            handlers: {
                save: () => {},
            },
            bindings: [{ selector: "#save-btn", event: "click", handler: "missing" }],
        })).toThrow('references unknown handler "missing"');
    });

    test("throws in strict mode when required selector is missing", () => {
        globalThis.window = {} as unknown as Window;
        globalThis.document = {
            querySelectorAll: vi.fn().mockReturnValue([]),
        } as unknown as Document;

        const source = createRenderOnLoadActionsSource({
            strict: true,
            handlers: {
                save: () => {},
            },
            bindings: [{ selector: "#missing", event: "click", handler: "save", required: true }],
        });

        expect(() => new Function(source)()).toThrow('No elements matched selector "#missing"');
    });

    test("rejects unsupported output values", () => {
        expect(() => resolveRenderOnLoadSource({ bad: true } as any)).toThrow(
            "Method 'renderOnLoad' must return a synchronous string, function, or defineRenderOnLoad(...) module."
        );
    });

    test("returns monaco typing and hint payloads", () => {
        const typeDefs = getRenderOnLoadMonacoTypeDefinitions();
        const hints = getRenderOnLoadMonacoHints();

        expect(typeDefs).toContain("declare namespace FDOOnLoad");
        expect(hints.length).toBeGreaterThan(0);
        expect(hints[0]).toHaveProperty("label");
        expect(hints[0]).toHaveProperty("insertText");
    });

    test("returns renderOnLoad templates and supports context filtering", () => {
        const allTemplates = listRenderOnLoadTemplates();
        expect(allTemplates.map((entry) => entry.id)).toEqual([
            "runtime-noop",
            "runtime-ui-message",
            "method-define-render-on-load",
            "method-define-render-on-load-actions",
        ]);

        const runtimeTemplates = listRenderOnLoadTemplates({ context: "runtime-source" });
        expect(runtimeTemplates.map((entry) => entry.id)).toEqual([
            "runtime-noop",
            "runtime-ui-message",
        ]);
    });

    test("returns a cloned template by id", () => {
        const template = getRenderOnLoadTemplate("method-define-render-on-load-actions");
        expect(template).not.toBeNull();
        expect(template?.context).toBe("plugin-method");
        expect(template?.source).toContain("defineRenderOnLoadActions");

        if (template) {
            template.source = "mutated";
        }

        const again = getRenderOnLoadTemplate("method-define-render-on-load-actions");
        expect(again?.source).toContain("defineRenderOnLoadActions");
    });

    test("returns null for unknown renderOnLoad template id", () => {
        expect(getRenderOnLoadTemplate("missing-template")).toBeNull();
        expect(getRenderOnLoadTemplate("")).toBeNull();
    });
});

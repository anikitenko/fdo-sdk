/**
 * Example plugin demonstrating the use of injected libraries and helper functions
 *
 * Learning objectives:
 * - Use host-injected iframe libraries without importing them in plugin backend code
 * - Keep browser-only logic in renderOnLoad()
 * - Route iframe UI actions to backend handlers through UI_MESSAGE
 * - Treat this example as an injected-libraries/runtime-boundary lesson, not a DOM-helper lesson
 *
 * Important:
 * - DOM helpers are still a best practice for general SDK-native structured UI
 * - This example intentionally uses plain markup so the focus stays on injected globals and iframe runtime behavior
 */

import {
    createClipboardReadRequest,
    createClipboardWriteRequest,
    FDO_SDK,
    FDOInterface,
    PluginMetadata,
    PluginCapability,
    PluginRegistry,
} from "@anikitenko/fdo-sdk";

export default class InjectedLibrariesDemoPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "Injected Libraries Demo",
        version: "1.0.0",
        author: "FDO SDK",
        description: "Demonstrates the use of automatically injected libraries and helper functions",
        icon: "lightbulb"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return ["system.clipboard.read", "system.clipboard.write"];
    }

    init(): void {
        this.log("InjectedLibrariesDemoPlugin initialized!");
        PluginRegistry.registerHandler("demo.getPluginInfo", async (content?: unknown) => {
            const pluginId =
                typeof content === "object" &&
                content !== null &&
                "id" in content &&
                typeof (content as { id?: unknown }).id === "string"
                    ? (content as { id: string }).id
                    : "unknown-plugin";

            return {
                pluginId,
                pluginName: this.metadata.name,
                sdkPattern: "UI_MESSAGE",
                runtime: "backend-handler",
            };
        });

        PluginRegistry.registerHandler("demo.getClipboardWriteRequest", async (content?: unknown) => {
            const text =
                typeof content === "object" &&
                content !== null &&
                "text" in content &&
                typeof (content as { text?: unknown }).text === "string"
                    ? (content as { text: string }).text
                    : "";

            if (!text) {
                throw new Error("Clipboard demo requires a non-empty text payload.");
            }

            return createClipboardWriteRequest(
                text,
                "copy editor content from injected libraries demo"
            );
        });

        PluginRegistry.registerHandler("demo.getClipboardReadRequest", async () => {
            return createClipboardReadRequest("read clipboard content from injected libraries demo");
        });
    }

    render(): string {
        return `
            <div style="padding: 20px;">
                <h2><i class="fas fa-book"></i> Injected Libraries Demo</h2>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>1. Pure CSS Responsive Grid</h3>
                    <div class="pure-g">
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #e3f2fd; margin: 5px;">
                                <strong>Column 1</strong><br />
                                Full width on mobile, half on tablet, third on desktop
                            </div>
                        </div>
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #fff3e0; margin: 5px;">
                                <strong>Column 2</strong><br />
                                Responsive grid using Pure CSS
                            </div>
                        </div>
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #f1f8e9; margin: 5px;">
                                <strong>Column 3</strong><br />
                                No extra CSS needed!
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>2. Notyf Notifications</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                        <button id="show-success-btn" class="pure-button pure-button-primary">
                            <i class="fas fa-check"></i> Show Success
                        </button>
                        <button id="show-error-btn" class="pure-button" style="background: #d32f2f; color: white;">
                            <i class="fas fa-times"></i> Show Error
                        </button>
                        <button id="show-custom-btn" class="pure-button" style="background: #7b1fa2; color: white;">
                            <i class="fas fa-info-circle"></i> Show Custom
                        </button>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>3. FontAwesome Icons</h3>
                    <div>
                        <i class="fas fa-home" title="Solid Home" style="font-size: 24px; margin: 10px;"></i>
                        <i class="fas fa-user" title="Solid User" style="font-size: 24px; margin: 10px;"></i>
                        <i class="fas fa-heart" title="Solid Heart" style="font-size: 24px; margin: 10px; color: red;"></i>
                        <i class="far fa-heart" title="Regular Heart" style="font-size: 24px; margin: 10px;"></i>
                        <i class="fas fa-star" title="Solid Star" style="font-size: 24px; margin: 10px; color: gold;"></i>
                        <i class="far fa-star" title="Regular Star" style="font-size: 24px; margin: 10px;"></i>
                        <i class="fab fa-github" title="GitHub" style="font-size: 24px; margin: 10px;"></i>
                        <i class="fab fa-twitter" title="Twitter" style="font-size: 24px; margin: 10px; color: #1da1f2;"></i>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>4. Syntax Highlighting with Highlight.js</h3>
                    <pre><code class="language-javascript">// JavaScript code with syntax highlighting
const message = "Hello, World!";

function greet(name) &#123;
    return \`Hello, \${name}!\`;
&#125;

class Plugin extends FDO_SDK &#123;
    init() &#123;
        this.log("Plugin initialized");
    &#125;
&#125;
</code></pre>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>5. ACE Code Editor</h3>
                    <div id="editor" style="height: 300px; border: 1px solid #ccc;"></div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                        <button id="get-editor-content-btn" class="pure-button">
                            <i class="fas fa-clipboard"></i> Copy Editor Content
                        </button>
                        <button id="read-clipboard-btn" class="pure-button">
                            <i class="fas fa-clipboard-file"></i> Read Clipboard
                        </button>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>6. Resizable Panels with Split Grid</h3>
                    <div style="display: grid; grid-template-columns: 1fr 10px 1fr; height: 400px; border: 1px solid #ccc;">
                        <div style="padding: 15px; overflow: auto; background: #e8f5e9;">
                            <h4>Left Panel</h4>
                            <p>Drag the center gutter to resize panels.</p>
                            <ul>
                                <li>Draggable divider</li>
                                <li>Customizable min/max sizes</li>
                                <li>Snap to grid support</li>
                            </ul>
                        </div>
                        <div class="gutter gutter-col-1" style="background-color: #eee; cursor: col-resize; background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg=='); background-repeat: no-repeat; background-position: center;"></div>
                        <div style="padding: 15px; overflow: auto; background: #fff3e0;">
                            <h4>Right Panel</h4>
                            <p>Perfect for creating split-view layouts!</p>
                            <pre><code class="language-javascript">Split(&#123;
    columnGutters: [&#123;
        track: 1,
        element: document.querySelector('.gutter-col-1')
    &#125;]
&#125;);</code></pre>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h3>7. Window Helper Functions</h3>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                        <button id="test-backend-req-btn" class="pure-button">
                            <i class="fas fa-server"></i> Test Backend Request
                        </button>
                        <button id="test-wait-for-element-btn" class="pure-button">
                            <i class="fas fa-search"></i> Test Wait for Element
                        </button>
                        <button id="test-apply-class-btn" class="pure-button">
                            <i class="fas fa-palette"></i> Apply Class
                        </button>
                    </div>
                    <div id="helper-output" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; min-height: 50px;">Output will appear here...</div>
                </div>
            </div>
        `;
    }

    renderOnLoad(): string {
        return `
            (() => {
                const output = document.getElementById("helper-output");
                const setOutput = (html) => {
                    if (output) {
                        output.innerHTML = html;
                    }
                };

                const bindClick = (selector, handler) => {
                    const element = document.getElementById(selector);
                    if (element) {
                        element.addEventListener("click", handler);
                    }
                };

                const notyf = new Notyf({
                    duration: 3000,
                    position: { x: "right", y: "top" },
                    ripple: true,
                    dismissible: true
                });

                bindClick("show-success-btn", () => {
                    notyf.success("Operation completed successfully! ✓");
                });

                bindClick("show-error-btn", () => {
                    notyf.error("An error occurred! ✗");
                });

                bindClick("show-custom-btn", () => {
                    notyf.open({
                        type: "info",
                        message: "This is a custom notification with a longer message that demonstrates the flexibility of Notyf!",
                        background: "#7b1fa2",
                        duration: 5000
                    });
                });

                hljs.highlightAll();

                window.waitForElement("#editor", () => {
                    const editor = ace.edit("editor");
                    editor.setTheme("ace/theme/monokai");
                    editor.session.setMode("ace/mode/typescript");
                    editor.setValue(\`import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "My Plugin",
        version: "1.0.0",
        author: "Your Name",
        description: "Plugin description",
        icon: "rocket"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("MyPlugin initialized!");
    }

    render(): string {
        return "<div>Hello from my plugin!</div>";
    }
}

new MyPlugin();\`, 1);
                    editor.setOptions({
                        fontSize: "14px",
                        showPrintMargin: false
                    });

                    bindClick("get-editor-content-btn", async () => {
                        const content = editor.getValue();
                        setOutput("Preparing clipboard request...");
                        try {
                            const request = await window.createBackendReq("UI_MESSAGE", {
                                handler: "demo.getClipboardWriteRequest",
                                content: { text: content }
                            });
                            const response = await window.createBackendReq("requestPrivilegedAction", {
                                correlationId: \`clipboard-\${Date.now()}\`,
                                request
                            });

                            if (response && response.ok) {
                                notyf.success("Editor content copied to clipboard.");
                                setOutput(\`<strong>Clipboard Response:</strong><br /><pre>\${JSON.stringify(response, null, 2)}</pre>\`);
                            } else {
                                notyf.error("Clipboard write was denied.");
                                setOutput(\`<strong>Clipboard Error:</strong><br /><pre>\${JSON.stringify(response, null, 2)}</pre>\`);
                            }
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            notyf.error("Clipboard write failed.");
                            setOutput(\`<strong>Clipboard Exception:</strong><br /><pre>\${message}</pre>\`);
                        }
                    });

                    bindClick("read-clipboard-btn", async () => {
                        setOutput("Preparing clipboard read request...");
                        try {
                            const request = await window.createBackendReq("UI_MESSAGE", {
                                handler: "demo.getClipboardReadRequest",
                                content: {}
                            });
                            const response = await window.createBackendReq("requestPrivilegedAction", {
                                correlationId: \`clipboard-\${Date.now()}\`,
                                request
                            });

                            if (response && response.ok) {
                                notyf.success("Clipboard content loaded.");
                                setOutput(\`<strong>Clipboard Read Response:</strong><br /><pre>\${JSON.stringify(response, null, 2)}</pre>\`);
                            } else {
                                notyf.error("Clipboard read was denied.");
                                setOutput(\`<strong>Clipboard Read Error:</strong><br /><pre>\${JSON.stringify(response, null, 2)}</pre>\`);
                            }
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            notyf.error("Clipboard read failed.");
                            setOutput(\`<strong>Clipboard Read Exception:</strong><br /><pre>\${message}</pre>\`);
                        }
                    });
                });

                window.waitForElement(".gutter-col-1", () => {
                    Split({
                        columnGutters: [{
                            track: 1,
                            element: document.querySelector(".gutter-col-1")
                        }],
                        columnMinSize: 100
                    });
                });

                bindClick("test-backend-req-btn", async () => {
                    setOutput("Sending backend request...");
                    try {
                        const result = await window.createBackendReq("UI_MESSAGE", {
                            handler: "demo.getPluginInfo",
                            content: { id: "demo-plugin" }
                        });
                        setOutput(\`<strong>Backend Response:</strong><br /><pre>\${JSON.stringify(result, null, 2)}</pre>\`);
                    } catch (_error) {
                        setOutput("<strong>Error:</strong> Backend request failed");
                    }
                });

                bindClick("test-wait-for-element-btn", () => {
                    setOutput("Creating dynamic element...");
                    setTimeout(() => {
                        const newDiv = document.createElement("div");
                        newDiv.id = "dynamic-element";
                        newDiv.textContent = "I am a dynamically created element!";
                        newDiv.style.cssText = "padding: 10px; background: #4caf50; color: white; border-radius: 3px; margin-top: 10px;";
                        if (output) {
                            output.appendChild(newDiv);
                        }
                    }, 500);

                    window.waitForElement("#dynamic-element", (element) => {
                        notyf.success("Found the dynamic element!");
                        element.style.animation = "pulse 0.5s";
                    }, 2000);
                });

                bindClick("test-apply-class-btn", () => {
                    window.applyClassToSelector("pure-button-primary", "#helper-output");
                    if (output) {
                        output.style.cssText = "padding: 15px; margin-top: 10px; border-radius: 5px; font-weight: bold;";
                        output.innerHTML = 'Class "pure-button-primary" applied to this element! This visual demo resets after 3 seconds.';
                    }
                    notyf.success("CSS class applied successfully!");
                    setTimeout(() => {
                        if (output) {
                            output.className = "";
                            output.style.cssText = "margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; min-height: 50px;";
                            output.innerHTML = "Output will appear here...";
                        }
                    }, 3000);
                });

                window.addGlobalEventListener("keydown", (event) => {
                    if (event.key === "F1") {
                        event.preventDefault();
                        notyf.open({
                            type: "info",
                            message: "F1 Help: This demo shows all available injected libraries!",
                            background: "#2196f3",
                            duration: 4000
                        });
                    }
                });

                setOutput(\`<strong>Injected Libraries Demo loaded successfully.</strong><br /><pre>\${JSON.stringify({
                    Notyf: typeof Notyf !== "undefined",
                    hljs: typeof hljs !== "undefined",
                    ace: typeof ace !== "undefined",
                    Split: typeof Split !== "undefined"
                }, null, 2)}</pre>\`);
            })();
        `;
    }
}

new InjectedLibrariesDemoPlugin();

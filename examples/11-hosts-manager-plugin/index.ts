import {
    DOM,
    createHostsWriteActionRequest,
    createPrivilegedActionBackendRequest,
    extractPrivilegedActionRequest,
    FDOInterface,
    FDO_SDK,
    getInlinePrivilegedActionErrorFormatterSource,
    PluginCapability,
    PluginMetadata,
    PluginRegistry,
} from "@anikitenko/fdo-sdk";
import { HostsLogic } from "./HostsLogic";
// @ts-ignore
import css from "./styles/style.css";

/**
 * Learning example 11: Multi-file Hosts Manager.
 *
 * This example demonstrates:
 * 1. Multi-file plugin structure (index.ts, HostsLogic.ts, styles/style.css).
 * 2. Real-world use case: Managing /etc/hosts (SwitchHosts style).
 * 3. CSS-object import compiled by host + DOM helper class generation.
 * 4. Advanced state management and privileged action requests.
 */
export default class HostsManagerPlugin extends FDO_SDK implements FDOInterface {
    private static readonly APPLY_HANDLER = "hostsManager.v1.apply";
    private static readonly TOGGLE_HANDLER = "hostsManager.v1.toggle";
    private static readonly GET_DATA_HANDLER = "hostsManager.v1.getData";
    private static readonly SELECT_HANDLER = "hostsManager.v1.select";

    private readonly logic = new HostsLogic();
    private readonly dom = new DOM();
    private readonly classes = this.buildClassNames(css as Record<string, unknown>);
    private selectedEnvironmentId = this.logic.getEnvironments()[0]?.id ?? "";

    private readonly _metadata: PluginMetadata = {
        name: "HostsManager",
        version: "1.0.0",
        author: "FDO Explorer",
        description: "A real-world multi-file example for managing host environments.",
        icon: "social-network",
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return ["system.hosts.write"];
    }

    private buildClassNames(styles: Record<string, unknown>): Record<string, string> {
        const classNames: Record<string, string> = {};

        for (const [key, styleObject] of Object.entries(styles)) {
            if (!key || key.startsWith("@")) {
                continue;
            }
            if (!styleObject || typeof styleObject !== "object") {
                continue;
            }
            classNames[key] = this.dom.createClassFromStyle(styleObject as Record<string, string>);
        }

        return classNames;
    }

    private cls(name: string): string {
        return this.classes[name] ?? "";
    }

    init(): void {
        this.info("Hosts Manager Plugin Initialized");

        PluginRegistry.registerHandler(HostsManagerPlugin.SELECT_HANDLER, (data: { id?: string }) => {
            const id = typeof data?.id === "string" ? data.id : "";
            if (!id) {
                return {
                    ok: false,
                    error: "Missing environment id.",
                };
            }
            this.selectedEnvironmentId = id;
            return {
                ok: true,
                selectedEnvironmentId: this.selectedEnvironmentId,
                environments: this.logic.getEnvironments(),
            };
        });

        PluginRegistry.registerHandler(HostsManagerPlugin.TOGGLE_HANDLER, (data: { id?: string }) => {
            const id = typeof data?.id === "string" ? data.id : "";
            if (!id) {
                return {
                    ok: false,
                    error: "Missing environment id.",
                };
            }
            this.logic.toggleEnvironment(id);
            this.selectedEnvironmentId = id;
            return {
                ok: true,
                selectedEnvironmentId: this.selectedEnvironmentId,
                environments: this.logic.getEnvironments(),
            };
        });

        PluginRegistry.registerHandler(HostsManagerPlugin.GET_DATA_HANDLER, () => {
            return {
                ok: true,
                selectedEnvironmentId: this.selectedEnvironmentId,
                environments: this.logic.getEnvironments(),
            };
        });

        PluginRegistry.registerHandler(HostsManagerPlugin.APPLY_HANDLER, () => {
            const activeRecords = this.logic.getActiveRecords();
            const request = createHostsWriteActionRequest({
                action: "system.hosts.write",
                payload: {
                    records: activeRecords,
                    tag: "fdo-managed",
                    dryRun: false
                }
            });

            return createPrivilegedActionBackendRequest(request, {
                correlationIdPrefix: "hosts-mgr"
            });
        });
    }

    render(): string {
        const content = `
            <div class="${this.cls("hostsManager")}">
                <header class="${this.cls("chromeBar")}">
                    <div class="${this.cls("chromeLeft")}">
                        <span class="${this.cls("chromeDot")} ${this.cls("chromeDotRed")}"></span>
                        <span class="${this.cls("chromeDot")} ${this.cls("chromeDotYellow")}"></span>
                        <span class="${this.cls("chromeDot")} ${this.cls("chromeDotGreen")}"></span>
                        <span class="${this.cls("chromeGlyph")}">▣</span>
                        <span class="${this.cls("chromeGlyph")}">+</span>
                    </div>
                    <div class="${this.cls("chromeCenter")}">
                        <span class="${this.cls("chromeFileIcon")}">📄</span>
                        <strong class="${this.cls("chromeTitle")}">my</strong>
                    </div>
                    <div class="${this.cls("chromeRight")}">
                        <button id="hosts-refresh-btn" class="${this.cls("toolbarButton")}" type="button">Refresh</button>
                        <button id="hosts-apply-btn" class="${this.cls("toolbarButton")} ${this.cls("applyButton")}" type="button">Apply</button>
                    </div>
                </header>

                <div class="${this.cls("layout")}">
                    <aside class="${this.cls("sidebar")}">
                        <div class="${this.cls("sidebarHeader")}">
                            <span class="${this.cls("sidebarIcon")}">🖥</span>
                            <strong class="${this.cls("sidebarTitle")}">System Hosts</strong>
                        </div>
                        <div id="env-list" class="${this.cls("environmentList")}">
                            <p class="${this.cls("emptyState")}">Loading environments...</p>
                        </div>
                    </aside>

                    <section class="${this.cls("editorPane")}">
                        <div class="${this.cls("editorHeader")}">
                            <span class="${this.cls("editorFileIcon")}">📄</span>
                            <strong id="hosts-preview-title" class="${this.cls("editorTitle")}">my</strong>
                        </div>
                        <div id="hosts-preview" class="${this.cls("codeViewport")}">
                            <p class="${this.cls("emptyState")}">Loading preview...</p>
                        </div>
                    </section>
                </div>

                <div id="status-display" class="${this.cls("statusArea")}"></div>
            </div>
        `;

        return this.dom.renderHTML(content);
    }

    renderOnLoad(): string {
        const formatPrivilegedActionErrorSource = getInlinePrivilegedActionErrorFormatterSource();
        return `
            (() => {
                const envList = document.getElementById("env-list");
                const preview = document.getElementById("hosts-preview");
                const previewTitle = document.getElementById("hosts-preview-title");
                const applyBtn = document.getElementById("hosts-apply-btn");
                const refreshBtn = document.getElementById("hosts-refresh-btn");
                const statusDisplay = document.getElementById("status-display");
                const formatPrivilegedActionError = ${formatPrivilegedActionErrorSource};

                if (!envList || !preview || !previewTitle || !applyBtn || !refreshBtn || !statusDisplay) {
                    return;
                }

                const classes = {
                    environmentRow: "${this.cls("environmentRow")}",
                    environmentRowSelected: "${this.cls("environmentRowSelected")}",
                    environmentMeta: "${this.cls("environmentMeta")}",
                    environmentName: "${this.cls("environmentName")}",
                    environmentIcon: "${this.cls("environmentIcon")}",
                    environmentPath: "${this.cls("environmentPath")}",
                    environmentControls: "${this.cls("environmentControls")}",
                    toggleButton: "${this.cls("toggleButton")}",
                    toggleButtonActive: "${this.cls("toggleButtonActive")}",
                    toggleKnob: "${this.cls("toggleKnob")}",
                    toggleKnobActive: "${this.cls("toggleKnobActive")}",
                    codeLine: "${this.cls("codeLine")}",
                    lineNumber: "${this.cls("lineNumber")}",
                    codeText: "${this.cls("codeText")}",
                    codeComment: "${this.cls("codeComment")}",
                    codeIp: "${this.cls("codeIp")}",
                    codeHost: "${this.cls("codeHost")}",
                    statusSuccess: "${this.cls("statusSuccess")}",
                    statusError: "${this.cls("statusError")}",
                    emptyState: "${this.cls("emptyState")}",
                };

                let selectedEnvironmentId = "${this.selectedEnvironmentId}";
                let currentEnvironments = [];

                const escapeHtml = (value) =>
                    String(value ?? "")
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#39;");

                const showStatus = (message, isError = false) => {
                    statusDisplay.innerHTML = \`
                        <div class="\${isError ? classes.statusError : classes.statusSuccess}">
                            \${escapeHtml(message)}
                        </div>
                    \`;
                };

                const formatHostLine = (line) => {
                    if (!line.trim()) {
                        return \`<span class="\${classes.codeText}">&nbsp;</span>\`;
                    }

                    if (line.trim().startsWith("#")) {
                        return \`<span class="\${classes.codeComment}">\${escapeHtml(line)}</span>\`;
                    }

                    const parts = line.trim().split(/\\s+/);
                    const ip = parts.shift() || "";
                    const host = parts.join(" ");
                    return \`
                        <span class="\${classes.codeIp}">\${escapeHtml(ip)}</span>
                        <span class="\${classes.codeHost}">\${escapeHtml(host)}</span>
                    \`;
                };

                const renderPreview = () => {
                    const selected = currentEnvironments.find((env) => env.id === selectedEnvironmentId);
                    previewTitle.textContent = selected ? selected.name : "my";

                    const activeRecords = currentEnvironments
                        .filter((env) => env.active)
                        .flatMap((env) => env.records || []);

                    const lines = [
                        "##",
                        "# Host Database",
                        "#",
                        "# localhost is used to configure the loopback interface",
                        "# when the system is booting. Do not change this entry.",
                        "##",
                        "127.0.0.1 localhost",
                        "255.255.255.255 broadcasthost",
                        "::1 localhost",
                        "",
                        "# --- FDO Managed Records ---",
                    ];

                    activeRecords.forEach((record) => {
                        const comment = record.comment ? \` # \${record.comment}\` : "";
                        lines.push(\`\${record.address} \${record.hostname}\${comment}\`);
                    });

                    if (activeRecords.length === 0) {
                        lines.push("# no active environments");
                    }

                    preview.innerHTML = lines.map((line, index) => \`
                        <div class="\${classes.codeLine}">
                            <span class="\${classes.lineNumber}">\${index + 1}</span>
                            \${formatHostLine(line)}
                        </div>
                    \`).join("");
                };

                const selectEnvironment = async (id) => {
                    if (!id) {
                        return;
                    }

                    selectedEnvironmentId = id;
                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: "${HostsManagerPlugin.SELECT_HANDLER}",
                        content: { id }
                    });

                    if (response && response.environments) {
                        currentEnvironments = response.environments;
                        renderEnvironmentList();
                        renderPreview();
                    }
                };

                const toggleEnvironment = async (id) => {
                    if (!id) {
                        return;
                    }

                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: "${HostsManagerPlugin.TOGGLE_HANDLER}",
                        content: { id }
                    });

                    if (response && response.environments) {
                        selectedEnvironmentId = response.selectedEnvironmentId || id;
                        currentEnvironments = response.environments;
                        renderEnvironmentList();
                        renderPreview();
                    }
                };

                const renderEnvironmentList = () => {
                    if (!currentEnvironments.length) {
                        envList.innerHTML = \`<p class="\${classes.emptyState}">No environments available.</p>\`;
                        return;
                    }

                    envList.innerHTML = currentEnvironments.map((env, index) => \`
                        <div class="\${classes.environmentRow} \${env.id === selectedEnvironmentId ? classes.environmentRowSelected : ""}" data-select-id="\${env.id}">
                            <div class="\${classes.environmentMeta}">
                                <div class="\${classes.environmentName}">
                                    <span class="\${classes.environmentIcon}">\${index === 0 ? "📄" : "🌐"}</span>
                                    <span>\${escapeHtml(env.name)}</span>
                                </div>
                                <div class="\${classes.environmentPath}">
                                    \${escapeHtml(env.id)} - \${Array.isArray(env.records) ? env.records.length : 0} entries
                                </div>
                            </div>
                            <div class="\${classes.environmentControls}">
                                <button
                                    class="\${classes.toggleButton} \${env.active ? classes.toggleButtonActive : ""}"
                                    type="button"
                                    data-toggle-id="\${env.id}"
                                    aria-pressed="\${env.active ? "true" : "false"}"
                                    title="\${env.active ? "Disable" : "Enable"} \${escapeHtml(env.name)}"
                                >
                                    <span class="\${classes.toggleKnob} \${env.active ? classes.toggleKnobActive : ""}"></span>
                                </button>
                            </div>
                        </div>
                    \`).join('');

                    envList.querySelectorAll("[data-select-id]").forEach((row) => {
                        row.addEventListener("click", async () => {
                            const id = row.getAttribute("data-select-id");
                            await selectEnvironment(id);
                        });
                    });

                    envList.querySelectorAll("[data-toggle-id]").forEach((btn) => {
                        btn.addEventListener("click", async (event) => {
                            event.stopPropagation();
                            const id = btn.getAttribute("data-toggle-id");
                            await toggleEnvironment(id);
                        });
                    });
                };

                const reloadData = async () => {
                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: "${HostsManagerPlugin.GET_DATA_HANDLER}",
                        content: {}
                    });
                    if (response && response.environments) {
                        selectedEnvironmentId = response.selectedEnvironmentId || response.environments[0]?.id || selectedEnvironmentId;
                        currentEnvironments = response.environments;
                        renderEnvironmentList();
                        renderPreview();
                        showStatus("Environment data refreshed.");
                    }
                };

                refreshBtn.addEventListener("click", () => {
                    void reloadData();
                });

                applyBtn.addEventListener("click", async () => {
                    applyBtn.disabled = true;
                    const originalText = applyBtn.textContent;
                    applyBtn.textContent = "Applying...";
                    
                    try {
                        const envelope = await window.createBackendReq("UI_MESSAGE", {
                            handler: "${HostsManagerPlugin.APPLY_HANDLER}",
                            content: {}
                        });

                        const correlationId =
                            envelope?.result?.correlationId
                            ?? envelope?.correlationId
                            ?? "";
                        const requestPayload = extractPrivilegedActionRequest(envelope);
                        if (!requestPayload || typeof requestPayload !== "object") {
                            showStatus("Apply failed: malformed privileged request payload.", true);
                            return;
                        }
                        const result = await window.createBackendReq("requestPrivilegedAction", requestPayload);
                        
                        if (result && result.ok) {
                            const suffix = correlationId ? \` Correlation ID: \${correlationId}\` : "";
                            showStatus(\`Hosts file applied successfully.\${suffix}\`);
                            await reloadData();
                        } else {
                            showStatus(formatPrivilegedActionError(result, {
                                context: "Hosts apply failed",
                                fallbackCorrelationId: correlationId || "unknown",
                            }), true);
                        }
                    } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        showStatus("IPC Error: " + message, true);
                    } finally {
                        applyBtn.disabled = false;
                        applyBtn.textContent = originalText || "Apply";
                    }
                });

                void reloadData();
            })();
        `;
    }
}

new HostsManagerPlugin();

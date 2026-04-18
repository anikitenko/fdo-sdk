import {
    createAICapabilityPreset,
    createClipboardWriteRequest,
    DOMButton,
    DOMInput,
    createNetworkCapabilityBundle,
    createStorageCapabilityPreset,
    defineRenderOnLoadActions,
    DOMNested,
    DOMSemantic,
    DOMText,
    FDOInterface,
    FDO_SDK,
    PluginCapability,
    PluginMetadata,
    PluginRegistry,
    QuickAction,
    requireCapability,
    requireNetworkScopeCapability,
    runCapabilityPreflight,
    SidePanelConfig,
    StoreType,
} from "@anikitenko/fdo-sdk";

type ServiceContext = {
    providerId: string;
    accountId: string;
    sessionId: string;
    endpointUrl: string;
    workspaceId: string;
    path: string;
    authClientId: string;
    authTenantId: string;
    authRedirectUri: string;
    authScopes: string;
    authDeviceCode: string;
    authVerificationUri: string;
    authVerificationUriComplete: string;
    authUserCode: string;
    authPollIntervalSeconds: number;
    authCodeExpiresAt: string;
};

type ContentItem = {
    id: string;
    name: string;
    kind: "site" | "workspace" | "folder" | "file";
    webUrl: string;
    parentPath?: string;
    lastModifiedAt?: string;
};

type AuthBroker = {
    start?: (input: { providerId: string; accountHint?: string; endpointUrl?: string }) => unknown;
    refresh?: (input: { providerId: string; sessionId: string }) => unknown;
    logout?: (input: { providerId: string; sessionId: string }) => unknown;
};

type ContentBroker = {
    request?: (input: {
        providerId: string;
        sessionId: string;
        operation: string;
        endpointUrl?: string;
        workspaceId?: string;
        path?: string;
        query?: string;
        itemId?: string;
        scope?: "organization" | "anonymous";
        type?: "view" | "edit";
        limit?: number;
        cursor?: string;
    }) => unknown;
    invoke?: (input: {
        providerId: string;
        sessionId: string;
        operation: string;
        endpointUrl?: string;
        workspaceId?: string;
        path?: string;
        query?: string;
        itemId?: string;
        scope?: "organization" | "anonymous";
        type?: "view" | "edit";
        limit?: number;
        cursor?: string;
    }) => unknown;
    listWorkspaces?: (input: {
        providerId: string;
        sessionId: string;
        endpointUrl?: string;
        query?: string;
        limit?: number;
        cursor?: string;
    }) => unknown;
    listItems?: (input: {
        providerId: string;
        sessionId: string;
        endpointUrl?: string;
        workspaceId: string;
        path?: string;
        limit?: number;
        cursor?: string;
    }) => unknown;
    search?: (input: {
        providerId: string;
        sessionId: string;
        endpointUrl?: string;
        workspaceId?: string;
        query: string;
        limit?: number;
        cursor?: string;
    }) => unknown;
    createShareLink?: (input: {
        providerId: string;
        sessionId: string;
        endpointUrl?: string;
        itemId: string;
        scope?: "organization" | "anonymous";
        type?: "view" | "edit";
    }) => unknown;
};

type OpenUrlBroker = {
    open?: (input: { url: string; policy: "trusted-content-link" }) => unknown;
};

type SessionRequestBroker = {
    request?: (input: {
        sessionId: string;
        method: string;
        url: string;
        query?: Record<string, string | number | boolean>;
        headers?: Record<string, string>;
        body?: unknown;
    }) => unknown;
};

const DEFAULT_CONTEXT: ServiceContext = {
    providerId: "sharepoint",
    accountId: "",
    sessionId: "",
    endpointUrl: "",
    workspaceId: "",
    path: "/",
    authClientId: "",
    authTenantId: "common",
    authRedirectUri: "http://localhost",
    authScopes: "openid profile offline_access User.Read Files.Read.All Sites.Read.All",
    authDeviceCode: "",
    authVerificationUri: "",
    authVerificationUriComplete: "",
    authUserCode: "",
    authPollIntervalSeconds: 5,
    authCodeExpiresAt: "",
};

export default class ServiceContentHubPlugin extends FDO_SDK implements FDOInterface {
    private static readonly BUILD_ID = "service-hub-2026-04-18-r3";
    private static readonly NETWORK_SCOPE_ID = "external-services";
    private static readonly PROVIDER_ENDPOINT_DEFAULTS: Record<string, string> = {
        sharepoint: "https://graph.microsoft.com/v1.0",
        dropbox: "https://api.dropboxapi.com/2",
        gdrive: "https://www.googleapis.com/drive/v3",
        confluence: "https://api.atlassian.com/ex/confluence",
    };

    private static readonly PREPARE_HANDLER = "serviceHub.v1.prepare";
    private static readonly SAVE_CONTEXT_HANDLER = "serviceHub.v1.saveContext";
    private static readonly AUTH_START_HANDLER = "serviceHub.v1.auth.start";
    private static readonly AUTH_REFRESH_HANDLER = "serviceHub.v1.auth.refresh";
    private static readonly AUTH_LOGOUT_HANDLER = "serviceHub.v1.auth.logout";
    private static readonly LIST_WORKSPACES_HANDLER = "serviceHub.v1.content.listWorkspaces";
    private static readonly LIST_ITEMS_HANDLER = "serviceHub.v1.content.listItems";
    private static readonly SEARCH_ITEMS_HANDLER = "serviceHub.v1.content.search";
    private static readonly CREATE_SHARE_LINK_HANDLER = "serviceHub.v1.content.createShareLink";
    private static readonly BUILD_CLIPBOARD_WRITE_REQUEST_HANDLER = "serviceHub.v1.buildClipboardWriteRequest";
    private static readonly OPEN_BROWSER_HANDLER = "serviceHub.v1.openBrowser";
    private static readonly ADD_FAVORITE_HANDLER = "serviceHub.v1.addFavorite";
    private static readonly AI_ASSIST_HANDLER = "fdo.ai.request.v1";
    private static readonly AI_ASSISTANTS_LIST_HANDLER = "fdo.ai.assistants.list.v1";
    private static readonly DEFAULT_AUTH_TENANT = "common";
    private static readonly DEFAULT_AUTH_REDIRECT_URI = "http://localhost";
    private static readonly DEFAULT_AUTH_SCOPES = "openid profile offline_access User.Read Files.Read.All Sites.Read.All";
    private static readonly QUICK_OPEN_FAVORITES_HANDLER = "serviceHub.v1.quick.openFavorites";
    private static readonly QUICK_SEARCH_HANDLER = "serviceHub.v1.quick.search";
    private static readonly SIDE_PANEL_BROWSER_HANDLER = "serviceHub.v1.sidePanel.browser";
    private static readonly SIDE_PANEL_RECENT_HANDLER = "serviceHub.v1.sidePanel.recent";
    private static readonly SIDE_PANEL_SETTINGS_HANDLER = "serviceHub.v1.sidePanel.settings";

    private static readonly STORAGE_KEYS = {
        CONTEXT: "serviceHub:context",
        FAVORITES: "serviceHub:favorites",
        RECENT_ACTIVITY: "serviceHub:recentActivity",
        LAST_CURSOR: "serviceHub:lastCursor",
    } as const;

    private readonly _metadata: PluginMetadata = {
        name: "SharePoint Desktop Client Plugin",
        version: "1.0.0",
        author: "FDO SDK",
        description: "SharePoint Online desktop client example with plugin-owned Microsoft login flow.",
        icon: "applications",
    };

    private readonly declaredCapabilities: PluginCapability[] = [
        ...createNetworkCapabilityBundle({
            transports: ["https"],
            scopeId: ServiceContentHubPlugin.NETWORK_SCOPE_ID,
        }),
        "system.network.scope.external-services",
        ...createStorageCapabilityPreset("storageJSON"),
        ...createAICapabilityPreset("host.ai"),
        "system.clipboard.write",
    ];

    private sessionStore?: StoreType;
    private persistentStore?: StoreType;
    private jsonStoreAvailable = false;
    private handlersRegistered = false;

    constructor() {
        super();
        this.registerHandlers();
    }

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    declareCapabilities(): PluginCapability[] {
        return [...this.declaredCapabilities];
    }

    defineQuickActions(): QuickAction[] {
        return [
            {
                name: "Service Favorites",
                subtitle: "Open pinned items from connected services",
                icon: "star",
                message_type: ServiceContentHubPlugin.QUICK_OPEN_FAVORITES_HANDLER,
            },
            {
                name: "Service Search",
                subtitle: "Focus search workflow",
                icon: "search",
                message_type: ServiceContentHubPlugin.QUICK_SEARCH_HANDLER,
            },
        ];
    }

    defineSidePanel(): SidePanelConfig {
        return {
            icon: "applications",
            label: "Service Hub",
            submenu_list: [
                {
                    id: "service-browser",
                    name: "Browser",
                    message_type: ServiceContentHubPlugin.SIDE_PANEL_BROWSER_HANDLER,
                },
                {
                    id: "service-recent",
                    name: "Recent",
                    message_type: ServiceContentHubPlugin.SIDE_PANEL_RECENT_HANDLER,
                },
                {
                    id: "service-settings",
                    name: "Settings",
                    message_type: ServiceContentHubPlugin.SIDE_PANEL_SETTINGS_HANDLER,
                },
            ],
        };
    }

    init(): void {
        this.registerHandlers();
        this.ensurePersistentStore();
        const report = runCapabilityPreflight({
            action: "initialize service content hub plugin",
            declared: this.declaredCapabilities,
            granted: this.getGrantedCapabilities(),
        });
        if (!report.ok) {
            this.warn(`Service hub capability preflight warning: ${report.summary}`, {
                missing: report.missing.map((entry) => entry.capability),
                remediations: report.remediations,
            });
        }
    }

    render(): string {
        const text = new DOMText();
        const nested = new DOMNested();
        const semantic = new DOMSemantic();
        const button = new DOMButton();

        const contextInputs = nested.createBlockDiv(
            [
                new DOMInput("sh-workspace-id", {}, {
                    placeholder: "SharePoint Site ID",
                }).createInput("text"),
                new DOMInput("sh-path", {}, {
                    placeholder: "Path (/)",
                }).createInput("text"),
            ],
            { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: "8px" } }
        );
        const sharePointSiteIdHelp = nested.createBlockDiv(
            [
                text.createPText(
                    "SharePoint Site ID is not something you invent. It is the exact id returned by Microsoft Graph for one SharePoint site.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "Easiest way in this example: sign in, type part of the site name into Search query, click List Workspaces, then copy the id from the result you want.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "If you already know the SharePoint site URL, for example https://contoso.sharepoint.com/sites/Marketing, open Graph Explorer and run: GET /sites/contoso.sharepoint.com:/sites/Marketing. Then copy the id field from the response into this box.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "Why the id looks unusual: Graph site ids usually look like contoso.sharepoint.com,GUID,GUID. That is normal. The two GUID values are different internal identifiers, not a duplicate by mistake.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
            ],
            {
                style: {
                    display: "grid",
                    gap: "4px",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px 12px",
                },
            }
        );
        const sharePointAuthInputs = nested.createBlockDiv(
            [
                new DOMInput("sh-auth-client-id", {}, {
                    placeholder: "SharePoint App (client) ID",
                }).createInput("text"),
                new DOMInput("sh-auth-tenant-id", {}, {
                    placeholder: "Tenant ID or domain (for example: organizations or your-tenant-id)",
                }).createInput("text"),
            ],
            { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(280px, 420px))", gap: "8px" } }
        );

        const authActions = nested.createBlockDiv(
            [
                button.createStaticButton("Save Context", { classes: ["pure-button-primary"] }, "sh-save-context"),
                button.createStaticButton("Sign in with Microsoft", { classes: ["pure-button-primary"] }, "sh-ms-login"),
                button.createStaticButton("Auth Refresh", {}, "sh-auth-refresh"),
                button.createStaticButton("Sign Out", {}, "sh-auth-logout"),
            ],
            { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }
        );
        const sharePointSetupCard = nested.createBlockDiv(
            [
                text.createHText(3, "Microsoft Setup", { style: { margin: "0 0 6px 0" } }),
                text.createPText(
                    "1. Open portal.azure.com and go to Microsoft Entra ID -> App registrations.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "2. Create or open your app, then copy Application (client) ID from the Overview page.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "3. In Authentication, enable Public client/native access for the app registration.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
                text.createPText(
                    "4. In API permissions, add delegated Microsoft Graph permissions such as User.Read, Files.Read.All, and Sites.Read.All.",
                    { style: { margin: "0", color: "#334155", fontSize: "12px" } }
                ),
            ],
            {
                style: {
                    display: "grid",
                    gap: "4px",
                    background: "#eef6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    padding: "12px",
                },
            }
        );

        const queryActions = nested.createBlockDiv(
            [
                button.createStaticButton("List Workspaces", {}, "sh-list-workspaces"),
                button.createStaticButton("List Items", {}, "sh-list-items"),
                button.createStaticButton("Next Page", {}, "sh-next-page"),
                new DOMInput("sh-cursor", { style: { minWidth: "220px" } }, {
                    placeholder: "Cursor (optional)",
                }).createInput("text"),
                new DOMInput("sh-search-query", { style: { minWidth: "240px" } }, {
                    placeholder: "Search query...",
                }).createInput("text"),
                button.createStaticButton("Search", { classes: ["pure-button-primary"] }, "sh-search-items"),
            ],
            { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }
        );

        const selectionActions = nested.createBlockDiv(
            [
                new DOMInput("sh-selected-item-id", { style: { minWidth: "320px" } }).createSelect([
                    new DOMInput("sh-selected-item-id-option").createOption("Select a result row...", ""),
                ]),
                button.createStaticButton("Create Share Link", {}, "sh-create-share-link"),
                button.createStaticButton("Open In Browser", {}, "sh-open-browser"),
                button.createStaticButton("Copy Link", {}, "sh-copy-share-link"),
                button.createStaticButton("Add Selected To Favorites", {}, "sh-add-favorite"),
                button.createStaticButton("AI Summarize", {}, "sh-ai-summarize"),
            ],
            { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }
        );

        const cards = nested.createBlockDiv(
            [
                nested.createBlockDiv(
                    [
                        text.createHText(3, "Favorites", { style: { margin: "0 0 8px 0" } }),
                        nested.createBlockDiv([], {
                            style: {
                                background: "#f6f7f9",
                                borderRadius: "6px",
                                padding: "10px",
                                minHeight: "120px",
                            },
                        }, "sh-favorites"),
                    ]
                ),
                nested.createBlockDiv(
                    [
                        text.createHText(3, "Recent Activity", { style: { margin: "0 0 8px 0" } }),
                        nested.createBlockDiv([], {
                            style: {
                                background: "#f6f7f9",
                                borderRadius: "6px",
                                padding: "10px",
                                minHeight: "120px",
                            },
                        }, "sh-recent"),
                    ]
                ),
            ],
            { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(280px, 1fr))", gap: "12px" } }
        );

        const appBody = nested.createBlockDiv(
            [
                text.createHText(2, "SharePoint Desktop Client", { style: { margin: "0" } }),
                text.createPText(
                    "SharePoint Online example: the plugin owns Microsoft sign-in flow and the host remains session-transport infrastructure.",
                    { style: { margin: "0", color: "#5f6b7c" } }
                ),
                text.createPText(
                    "Microsoft Graph still requires an app registration in Microsoft Entra ID. Enter the Application (client) ID and tenant here, then use Log In with Microsoft. This example uses Microsoft device code flow, so there is no localhost redirect back into FDO.",
                    { style: { margin: "0", color: "#5f6b7c", fontSize: "12px" } }
                ),
                sharePointSetupCard,
                contextInputs,
                sharePointSiteIdHelp,
                sharePointAuthInputs,
                authActions,
                queryActions,
                selectionActions,
                text.createPText("Runtime not prepared yet.", { style: { margin: "0", color: "#5f6b7c" } }, "sh-meta"),
                text.createPreText("No results yet.", {
                    style: {
                        margin: "0",
                        minHeight: "220px",
                        maxHeight: "420px",
                        overflow: "auto",
                        background: "#f6f7f9",
                        padding: "12px",
                        borderRadius: "6px",
                    },
                }, "sh-output"),
                cards,
            ],
            { style: { padding: "16px", display: "grid", gap: "12px" } }
        );

        const app = nested.createBlockDiv([appBody], {
            customAttributes: {
                "data-build-id": ServiceContentHubPlugin.BUILD_ID,
                "data-prepare-handler": ServiceContentHubPlugin.PREPARE_HANDLER,
                "data-save-context-handler": ServiceContentHubPlugin.SAVE_CONTEXT_HANDLER,
                "data-auth-start-handler": ServiceContentHubPlugin.AUTH_START_HANDLER,
                "data-auth-refresh-handler": ServiceContentHubPlugin.AUTH_REFRESH_HANDLER,
                "data-auth-logout-handler": ServiceContentHubPlugin.AUTH_LOGOUT_HANDLER,
                "data-list-workspaces-handler": ServiceContentHubPlugin.LIST_WORKSPACES_HANDLER,
                "data-list-items-handler": ServiceContentHubPlugin.LIST_ITEMS_HANDLER,
                "data-search-items-handler": ServiceContentHubPlugin.SEARCH_ITEMS_HANDLER,
                "data-create-share-link-handler": ServiceContentHubPlugin.CREATE_SHARE_LINK_HANDLER,
                "data-copy-link-handler": ServiceContentHubPlugin.BUILD_CLIPBOARD_WRITE_REQUEST_HANDLER,
                "data-open-browser-handler": ServiceContentHubPlugin.OPEN_BROWSER_HANDLER,
                "data-add-favorite-handler": ServiceContentHubPlugin.ADD_FAVORITE_HANDLER,
                "data-ai-assist-handler": ServiceContentHubPlugin.AI_ASSIST_HANDLER,
                "data-ai-assistants-handler": ServiceContentHubPlugin.AI_ASSISTANTS_LIST_HANDLER,
                "data-auth-client-id": "",
                "data-auth-tenant-id": ServiceContentHubPlugin.DEFAULT_AUTH_TENANT,
                "data-auth-redirect-uri": ServiceContentHubPlugin.DEFAULT_AUTH_REDIRECT_URI,
                "data-auth-scopes": ServiceContentHubPlugin.DEFAULT_AUTH_SCOPES,
            },
        }, "service-hub-root");

        return semantic.renderHTML(
            semantic.createMain([app], { style: { padding: "0", margin: "0" } })
        );
    }

    renderOnLoad() {
        return defineRenderOnLoadActions({
            setup: () => {
                const root = document.getElementById("service-hub-root");
                if (!root) {
                    return;
                }
                const readConfig = (attr: string, fallback: string): string => {
                    const value = root.getAttribute(attr);
                    return typeof value === "string" && value.trim() ? value.trim() : fallback;
                };
                const byId = (id: string) => document.getElementById(id);
                const readInput = (id: string) => {
                    const element = byId(id) as HTMLInputElement | null;
                    return element ? String(element.value || "").trim() : "";
                };
                const setText = (id: string, value: string) => {
                    const element = byId(id);
                    if (element) {
                        element.textContent = value;
                    }
                };
                const runtimeWindow = window as {
                    Notyf?: new (options?: unknown) => {
                        success: (message: string) => void;
                        error: (message: string) => void;
                    };
                    waitForElement?: (selector: string, callback: () => void) => void;
                };
                if (typeof runtimeWindow.waitForElement === "function") {
                    runtimeWindow.waitForElement("#sh-output", () => undefined);
                }
                const notifier = typeof runtimeWindow.Notyf === "function"
                    ? new runtimeWindow.Notyf({ duration: 2400, position: { x: "right", y: "top" } })
                    : null;
                const notifySuccess = (message: string) => {
                    notifier?.success(message);
                };
                const callBackend = async (handler: string, content: unknown) => {
                    return window.createBackendReq("UI_MESSAGE", { handler, content });
                };
                const handlers = {
                    prepare: readConfig("data-prepare-handler", "serviceHub.v1.prepare"),
                    saveContext: readConfig("data-save-context-handler", "serviceHub.v1.saveContext"),
                    authStart: readConfig("data-auth-start-handler", "serviceHub.v1.auth.start"),
                    authRefresh: readConfig("data-auth-refresh-handler", "serviceHub.v1.auth.refresh"),
                    authLogout: readConfig("data-auth-logout-handler", "serviceHub.v1.auth.logout"),
                    listWorkspaces: readConfig("data-list-workspaces-handler", "serviceHub.v1.content.listWorkspaces"),
                    listItems: readConfig("data-list-items-handler", "serviceHub.v1.content.listItems"),
                    searchItems: readConfig("data-search-items-handler", "serviceHub.v1.content.search"),
                    createShareLink: readConfig("data-create-share-link-handler", "serviceHub.v1.content.createShareLink"),
                    copyLink: readConfig("data-copy-link-handler", "serviceHub.v1.buildClipboardWriteRequest"),
                    openBrowser: readConfig("data-open-browser-handler", "serviceHub.v1.openBrowser"),
                    addFavorite: readConfig("data-add-favorite-handler", "serviceHub.v1.addFavorite"),
                    aiAssist: readConfig("data-ai-assist-handler", "fdo.ai.request.v1"),
                    aiAssistants: readConfig("data-ai-assistants-handler", "fdo.ai.assistants.list.v1"),
                };
                const readAuthInput = (id: string, fallbackAttr: string, fallbackDefault: string) => {
                    const value = readInput(id);
                    if (value) return value;
                    return readConfig(fallbackAttr, fallbackDefault);
                };
                const state = {
                    busy: false,
                    lastResults: [] as Array<Record<string, unknown>>,
                    lastShareLink: "",
                    aiAssistantId: "",
                    activeOperation: "listWorkspaces" as "listWorkspaces" | "listItems" | "searchItems",
                    nextCursor: "",
                    authPending: false,
                    isAuthenticated: false,
                };
                const syncAuthUi = () => {
                    const authRefreshButton = byId("sh-auth-refresh") as HTMLButtonElement | null;
                    const authLogoutButton = byId("sh-auth-logout") as HTMLButtonElement | null;
                    if (authRefreshButton) {
                        authRefreshButton.disabled = state.busy || (!state.authPending && !state.isAuthenticated);
                    }
                    if (authLogoutButton) {
                        authLogoutButton.disabled = state.busy || !state.isAuthenticated;
                    }
                    [
                        "sh-list-workspaces",
                        "sh-list-items",
                        "sh-next-page",
                        "sh-search-items",
                        "sh-create-share-link",
                        "sh-open-browser",
                        "sh-copy-share-link",
                        "sh-add-favorite",
                        "sh-ai-summarize",
                    ].forEach((id) => {
                        const button = byId(id) as HTMLButtonElement | null;
                        if (button) {
                            button.disabled = state.busy || !state.isAuthenticated;
                        }
                    });
                };
                const pickAuthSource = (payload: unknown): Record<string, unknown> => {
                    if (!payload || typeof payload !== "object") {
                        return {};
                    }
                    const record = payload as Record<string, unknown>;
                    if (record.raw && typeof record.raw === "object") {
                        return record.raw as Record<string, unknown>;
                    }
                    return record;
                };
                const renderRows = (items: Array<Record<string, unknown>>) => {
                    if (!items.length) return "No items.";
                    return items.slice(0, 200).map((item, index) => {
                        const name = typeof item.name === "string" ? item.name : "(unnamed)";
                        const kind = typeof item.kind === "string" ? item.kind : "item";
                        const webUrl = typeof item.webUrl === "string" ? item.webUrl : "";
                        return `${index + 1}. [${kind}] ${name}${webUrl ? `\n   ${webUrl}` : ""}`;
                    }).join("\n");
                };
                const renderListCard = (id: string, items: Array<Record<string, unknown>>, empty: string) => {
                    const node = byId(id);
                    if (!node) return;
                    if (!items.length) {
                        node.innerHTML = `<p style="margin:0;color:#5f6b7c;">${empty}</p>`;
                        return;
                    }
                    node.innerHTML = items.slice(0, 20).map((item) => {
                        const primary = typeof item.name === "string"
                            ? item.name
                            : (typeof item.action === "string" ? item.action : "(entry)");
                        const detail = typeof item.webUrl === "string"
                            ? item.webUrl
                            : (typeof item.detail === "string" ? item.detail : "");
                        const at = typeof item.at === "string" ? item.at : "";
                        return `<p style="margin:0 0 6px 0;"><strong>${primary}</strong>${detail ? `<br /><span>${detail}</span>` : ""}${at ? `<br /><span style="color:#5f6b7c;">${at}</span>` : ""}</p>`;
                    }).join("");
                };
                const buildContextPayload = () => ({
                    providerId: "sharepoint",
                    endpointUrl: "https://graph.microsoft.com/v1.0",
                    accountId: "",
                    workspaceId: readInput("sh-workspace-id"),
                    path: readInput("sh-path") || "/",
                    authConfig: {
                        clientId: readAuthInput("sh-auth-client-id", "data-auth-client-id", ""),
                        tenantId: readAuthInput("sh-auth-tenant-id", "data-auth-tenant-id", "common"),
                        redirectUri: readConfig("data-auth-redirect-uri", "http://localhost"),
                        scopes: readConfig("data-auth-scopes", "openid profile offline_access User.Read Files.Read.All Sites.Read.All"),
                    },
                });
                const currentCursor = () => readInput("sh-cursor");
                const renderAuthInstructions = (payload: {
                    message?: string;
                    verificationUrl?: string;
                    userCode?: string;
                }) => {
                    const parts = [
                        payload.message || "Open Microsoft verification, enter the displayed code, finish approval, then click Auth Refresh.",
                        payload.verificationUrl ? `Verification URL: ${payload.verificationUrl}` : "",
                        payload.userCode ? `User code: ${payload.userCode}` : "",
                    ].filter(Boolean);
                    setText("sh-output", parts.join("\n\n"));
                };
                const setBusy = (busy: boolean) => {
                    state.busy = busy;
                    [
                        "sh-save-context",
                        "sh-ms-login",
                    ].forEach((id) => {
                        const button = byId(id) as HTMLButtonElement | null;
                        if (button) button.disabled = busy;
                    });
                    syncAuthUi();
                };
                const asItems = (response: unknown): Array<Record<string, unknown>> => {
                    if (Array.isArray(response)) return response as Array<Record<string, unknown>>;
                    if (response && typeof response === "object" && Array.isArray((response as { items?: unknown[] }).items)) {
                        return (response as { items: Array<Record<string, unknown>> }).items;
                    }
                    return [];
                };
                const setSelectionOptions = (items: Array<Record<string, unknown>>) => {
                    const select = byId("sh-selected-item-id") as HTMLSelectElement | null;
                    if (!select) return;
                    const rows = ['<option value="">Select a result row...</option>'];
                    items.slice(0, 300).forEach((item, index) => {
                        const id = typeof item.id === "string" ? item.id : "";
                        if (!id) return;
                        const name = typeof item.name === "string" ? item.name : "(unnamed)";
                        const kind = typeof item.kind === "string" ? item.kind : "item";
                        rows.push(`<option value="${id}">${index + 1}. [${kind}] ${name}</option>`);
                    });
                    select.innerHTML = rows.join("");
                };
                const setCursor = (cursor: string) => {
                    const node = byId("sh-cursor") as HTMLInputElement | null;
                    if (node) {
                        node.value = cursor;
                    }
                };
                const readResponseCursor = (response: unknown) => {
                    if (!response || typeof response !== "object") {
                        return "";
                    }
                    const direct = typeof (response as { nextCursor?: unknown }).nextCursor === "string"
                        ? String((response as { nextCursor: string }).nextCursor).trim()
                        : "";
                    if (direct) {
                        return direct;
                    }
                    const nested = (response as { page?: { nextCursor?: unknown } }).page;
                    return typeof nested?.nextCursor === "string" ? nested.nextCursor.trim() : "";
                };
                const getSelectedItem = (): Record<string, unknown> | undefined => {
                    const selectedId = readInput("sh-selected-item-id");
                    if (selectedId) {
                        const selected = state.lastResults.find((entry) => typeof entry.id === "string" && entry.id === selectedId);
                        if (selected) return selected;
                    }
                    return state.lastResults[0];
                };
                const assertOk = (response: unknown, fallback: string) => {
                    if (response && typeof response === "object" && (response as { ok?: unknown }).ok === false) {
                        const code = typeof (response as { code?: unknown }).code === "string"
                            ? String((response as { code: string }).code).trim()
                            : "";
                        const correlationId = typeof (response as { correlationId?: unknown }).correlationId === "string"
                            ? String((response as { correlationId: string }).correlationId).trim()
                            : "";
                        const message = String((response as { error?: unknown }).error || fallback);
                        throw new Error(`${code ? `${code}: ` : ""}${message}${correlationId ? ` [${correlationId}]` : ""}`);
                    }
                };

                (window as { __serviceHubRuntime?: unknown }).__serviceHubRuntime = {
                    async prepare() {
                        const response = await callBackend(handlers.prepare, {});
                        const context = response && typeof response === "object" && (response as { context?: unknown }).context
                            ? (response as { context: Record<string, unknown> }).context
                            : {};
                        const setInput = (id: string, value: unknown, fallback = "") => {
                            const element = byId(id) as HTMLInputElement | null;
                            if (!element) return;
                            element.value = typeof value === "string" && value.trim() ? value : fallback;
                        };
                        setInput("sh-workspace-id", context.workspaceId, "");
                        setInput("sh-path", context.path, "/");
                        setInput("sh-auth-client-id", context.authClientId, readConfig("data-auth-client-id", ""));
                        setInput("sh-auth-tenant-id", context.authTenantId, readConfig("data-auth-tenant-id", "common"));
                        setInput("sh-cursor", (response as { cursor?: unknown }).cursor, "");
                        state.isAuthenticated = typeof context.sessionId === "string" && context.sessionId.trim().length > 0;
                        state.authPending = typeof context.authDeviceCode === "string" && context.authDeviceCode.trim().length > 0;
                        syncAuthUi();
                        renderListCard("sh-favorites", asItems((response as { favorites?: unknown }).favorites), "No favorites yet.");
                        renderListCard("sh-recent", asItems((response as { recentActivity?: unknown }).recentActivity), "No recent activity.");
                        if (state.isAuthenticated) {
                            setText("sh-meta", `Authenticated. Session restored. [build: ${readConfig("data-build-id", "unknown")}]`);
                        } else if (state.authPending) {
                            setText("sh-meta", `Authorization pending. Finish Microsoft sign-in, then click Auth Refresh. [build: ${readConfig("data-build-id", "unknown")}]`);
                        } else {
                            setText("sh-meta", `Ready [build: ${readConfig("data-build-id", "unknown")}].`);
                        }

                        const assistants = await callBackend(handlers.aiAssistants, { purpose: "automation" });
                        const list = asItems((assistants as { assistants?: unknown }).assistants ?? assistants);
                        const first = list.find((entry) => typeof entry.id === "string" && entry.id.trim());
                        state.aiAssistantId = first && typeof first.id === "string" ? first.id : "";
                    },
                    setBusy,
                    setMeta: (value: string) => setText("sh-meta", value),
                    setOutput: (value: string) => setText("sh-output", value),
                    async saveContext() {
                        const response = await callBackend(handlers.saveContext, buildContextPayload());
                        assertOk(response, "Save context failed.");
                        setText("sh-meta", "Context saved.");
                        notifySuccess("Context saved");
                    },
                    async authStart() {
                        const response = await callBackend(handlers.authStart, buildContextPayload());
                        assertOk(response, "Auth start failed.");
                        const envelope = response && typeof response === "object" ? response as Record<string, unknown> : {};
                        const raw = pickAuthSource(envelope);
                        const pickString = (...values: unknown[]) => {
                            const candidate = values.find((value) => typeof value === "string" && String(value).trim());
                            return typeof candidate === "string" ? candidate.trim() : "";
                        };
                        const sessionId = pickString(
                            envelope.sessionId,
                            envelope.session_id,
                            envelope.sid,
                            raw.sessionId,
                            raw.session_id,
                            raw.sid,
                            (raw.session && typeof raw.session === "object" ? (raw.session as Record<string, unknown>).id : undefined),
                        );
                        const normalizedAuthorizationUrl = pickString(
                            envelope.authorizationUrl,
                            envelope.authUrl,
                            envelope.loginUrl,
                            envelope.redirectUrl,
                            envelope.verificationUri,
                            envelope.verificationUrl,
                            envelope.webUrl,
                            envelope.url,
                            raw.authorizationUrl,
                            raw.authorization_url,
                            raw.authorizeUrl,
                            raw.authorize_url,
                            raw.authUrl,
                            raw.auth_url,
                            raw.loginUrl,
                            raw.login_url,
                            raw.redirectUrl,
                            raw.redirect_url,
                            raw.verificationUri,
                            raw.verification_uri,
                            raw.verificationUrl,
                            raw.verification_url,
                            raw.webUrl,
                            raw.url,
                            (raw.auth && typeof raw.auth === "object" ? (raw.auth as Record<string, unknown>).url : undefined),
                        );
                        const verificationUrl = pickString(
                            envelope.verificationUriComplete,
                            envelope.verificationUri,
                            envelope.verificationUrl,
                            raw.verification_uri_complete,
                            raw.verificationUriComplete,
                            raw.verification_uri,
                            raw.verificationUri,
                            raw.verification_url,
                            raw.verificationUrl,
                        );
                        const userCode = pickString(
                            envelope.userCode,
                            raw.user_code,
                            raw.userCode,
                        );
                        const brokerMessage = pickString(
                            envelope.message,
                            raw.message,
                        );
                        const pending = [
                            envelope.pending,
                            envelope.requiresInteraction,
                            envelope.requiresUserAction,
                            envelope.interactionRequired,
                            envelope.needsRedirect,
                            envelope.redirectRequired,
                            raw.pending,
                            raw.requiresInteraction,
                            raw.requiresUserAction,
                            raw.interactionRequired,
                            raw.needsRedirect,
                            raw.redirectRequired,
                            raw.state === "pending",
                            raw.state === "authorization_required",
                            raw.status === "pending",
                            raw.status === "authorization_required",
                        ].some((value) => value === true);
                        const authHint = typeof envelope.authHint === "string" ? envelope.authHint.trim() : "";
                        const hasAuthTxnEnvelope = typeof envelope.authTxnId === "string" && envelope.authTxnId.trim().length > 0;
                        const envelopeRawMissing = hasAuthTxnEnvelope && (!("raw" in envelope) || envelope.raw == null);
                        const browserUrl = verificationUrl || normalizedAuthorizationUrl;
                        const shouldRedirect = Boolean(browserUrl);
                        if (shouldRedirect) {
                            try {
                                const parsed = new URL(browserUrl);
                                if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                                    throw new Error("Authorization URL must use http or https.");
                                }
                            } catch (error) {
                                throw new Error(`Auth start returned invalid authorization URL: ${error instanceof Error ? error.message : String(error)}`);
                            }
                            const openResponse = await callBackend(handlers.openBrowser, { webUrl: browserUrl });
                            assertOk(openResponse, "Open auth redirect failed.");
                            renderAuthInstructions({
                                message: brokerMessage,
                                verificationUrl,
                                userCode,
                            });
                            state.authPending = true;
                            state.isAuthenticated = false;
                            syncAuthUi();
                            setText("sh-meta", verificationUrl
                                ? "Microsoft verification page opened. Enter the code shown in the plugin, finish sign-in, then click Auth Refresh."
                                : "Browser sign-in opened by plugin. Complete sign-in, then click Auth Refresh.");
                            notifySuccess(verificationUrl ? "Microsoft verification opened" : "Redirect requested");
                            return;
                        }
                        if (pending || envelopeRawMissing) {
                            renderAuthInstructions({
                                message: brokerMessage || authHint,
                                verificationUrl,
                                userCode,
                            });
                            state.authPending = true;
                            state.isAuthenticated = false;
                            syncAuthUi();
                            setText(
                                "sh-meta",
                                verificationUrl
                                    ? "Device auth initialized. Open Microsoft verification, approve access, then click Auth Refresh."
                                    : (authHint
                                        ? `Auth flow initialized, but host returned no redirect URL. ${authHint} Then click Auth Refresh.`
                                        : "Auth flow initialized, but host returned no redirect URL. Complete provider auth externally, then click Auth Refresh.")
                            );
                            notifySuccess("Auth flow initialized");
                            return;
                        }
                        if (sessionId && !pending) {
                            state.authPending = false;
                            state.isAuthenticated = true;
                            syncAuthUi();
                            setText("sh-meta", `Authenticated. Session: ${sessionId}`);
                            notifySuccess("Authenticated");
                            return;
                        }
                        throw new Error("Auth start did not return a session id or redirect URL.");
                    },
                    async nativeMicrosoftLogin() {
                        await (window as { __serviceHubRuntime?: { authStart?: () => Promise<void> } }).__serviceHubRuntime?.authStart?.();
                    },
                    async authRefresh() {
                        const response = await callBackend(handlers.authRefresh, buildContextPayload());
                        assertOk(response, "Auth refresh failed.");
                        const envelope = response && typeof response === "object" ? response as Record<string, unknown> : {};
                        const pending = envelope.pending === true;
                        const userCode = typeof envelope.userCode === "string" ? envelope.userCode.trim() : "";
                        const verificationUrl = typeof envelope.verificationUri === "string"
                            ? envelope.verificationUri.trim()
                            : (typeof envelope.verificationUriComplete === "string" ? envelope.verificationUriComplete.trim() : "");
                        const message = typeof envelope.message === "string" ? envelope.message.trim() : "";
                        if (pending) {
                            state.authPending = true;
                            state.isAuthenticated = false;
                            syncAuthUi();
                            renderAuthInstructions({ message, verificationUrl, userCode });
                            setText("sh-meta", "Authorization is still pending. Finish Microsoft sign-in, then click Auth Refresh again.");
                            notifySuccess("Authorization pending");
                            return;
                        }
                        const sessionId = typeof envelope.sessionId === "string" ? envelope.sessionId.trim() : "";
                        state.authPending = false;
                        state.isAuthenticated = true;
                        syncAuthUi();
                        setText("sh-meta", sessionId ? `Authenticated. Session: ${sessionId}` : "Authenticated.");
                        notifySuccess("Authenticated");
                    },
                    async authLogout() {
                        const response = await callBackend(handlers.authLogout, buildContextPayload());
                        assertOk(response, "Auth logout failed.");
                        state.authPending = false;
                        state.isAuthenticated = false;
                        syncAuthUi();
                        setText("sh-meta", "Session closed.");
                        notifySuccess("Session closed");
                    },
                    async listWorkspaces() {
                        state.activeOperation = "listWorkspaces";
                        const response = await callBackend(handlers.listWorkspaces, {
                            ...buildContextPayload(),
                            query: readInput("sh-search-query") || undefined,
                            cursor: currentCursor() || undefined,
                        });
                        assertOk(response, "List workspaces failed.");
                        const items = asItems(response);
                        state.lastResults = items;
                        state.nextCursor = readResponseCursor(response);
                        setCursor(state.nextCursor);
                        setSelectionOptions(items);
                        setText("sh-output", renderRows(items));
                        setText("sh-meta", `Listed ${items.length} workspaces.${state.nextCursor ? " Next page cursor available." : ""}`);
                        notifySuccess(`Listed ${items.length} workspaces`);
                    },
                    async listItems() {
                        state.activeOperation = "listItems";
                        const response = await callBackend(handlers.listItems, {
                            ...buildContextPayload(),
                            cursor: currentCursor() || undefined,
                        });
                        assertOk(response, "List items failed.");
                        const items = asItems(response);
                        state.lastResults = items;
                        state.nextCursor = readResponseCursor(response);
                        setCursor(state.nextCursor);
                        setSelectionOptions(items);
                        setText("sh-output", renderRows(items));
                        setText("sh-meta", `Listed ${items.length} items.${state.nextCursor ? " Next page cursor available." : ""}`);
                        notifySuccess(`Listed ${items.length} items`);
                    },
                    async searchItems() {
                        state.activeOperation = "searchItems";
                        const response = await callBackend(handlers.searchItems, {
                            ...buildContextPayload(),
                            query: readInput("sh-search-query"),
                            cursor: currentCursor() || undefined,
                        });
                        assertOk(response, "Search failed.");
                        const items = asItems(response);
                        state.lastResults = items;
                        state.nextCursor = readResponseCursor(response);
                        setCursor(state.nextCursor);
                        setSelectionOptions(items);
                        setText("sh-output", renderRows(items));
                        setText("sh-meta", `Search returned ${items.length} item(s).${state.nextCursor ? " Next page cursor available." : ""}`);
                        notifySuccess(`Search returned ${items.length} item(s)`);
                    },
                    async nextPage() {
                        if (!state.nextCursor) {
                            throw new Error("No next cursor available.");
                        }
                        setCursor(state.nextCursor);
                        await (window as { __serviceHubRuntime?: { [key: string]: () => Promise<void> } }).__serviceHubRuntime?.[state.activeOperation]?.();
                    },
                    async createShareLink() {
                        const selected = getSelectedItem();
                        const itemId = selected && typeof selected.id === "string" ? selected.id : "";
                        if (!itemId) throw new Error("No result selected. Run list/search first.");
                        const response = await callBackend(handlers.createShareLink, {
                            ...buildContextPayload(),
                            itemId,
                            scope: "organization",
                            type: "view",
                        });
                        assertOk(response, "Create share link failed.");
                        const link = response && typeof response === "object" && typeof (response as { webUrl?: unknown }).webUrl === "string"
                            ? String((response as { webUrl: string }).webUrl).trim()
                            : "";
                        if (!link) throw new Error("Host returned empty share link.");
                        state.lastShareLink = link;
                        setText("sh-output", `${link}\n\n${String(byId("sh-output")?.textContent || "")}`);
                        setText("sh-meta", "Share link created.");
                        notifySuccess("Share link created");
                    },
                    async openInBrowser() {
                        const selected = getSelectedItem();
                        const webUrl = selected && typeof selected.webUrl === "string" ? selected.webUrl.trim() : "";
                        if (!webUrl) {
                            throw new Error("Selected result does not have a web URL.");
                        }
                        const response = await callBackend(handlers.openBrowser, { webUrl });
                        assertOk(response, "Open in browser failed.");
                        setText("sh-meta", "Browser open request sent to host.");
                        notifySuccess("Open in browser requested");
                    },
                    async copyShareLink() {
                        if (!state.lastShareLink) throw new Error("No share link available yet.");
                        const requestPayload = await callBackend(handlers.copyLink, { text: state.lastShareLink });
                        const response = await window.createBackendReq("requestPrivilegedAction", requestPayload);
                        if (!response || typeof response !== "object" || (response as { ok?: unknown }).ok !== true) {
                            throw new Error(String((response as { error?: unknown }).error || "Clipboard write failed."));
                        }
                        setText("sh-meta", "Share link copied to clipboard.");
                        notifySuccess("Share link copied");
                    },
                    async addFavorite() {
                        const selected = getSelectedItem();
                        if (!selected) throw new Error("No result available to pin.");
                        const response = await callBackend(handlers.addFavorite, { item: selected });
                        assertOk(response, "Add favorite failed.");
                        renderListCard("sh-favorites", asItems((response as { favorites?: unknown }).favorites), "No favorites yet.");
                        setText("sh-meta", "Favorite added.");
                        notifySuccess("Favorite added");
                    },
                    async summarizeWithAI() {
                        const response = await callBackend(handlers.aiAssist, {
                            task: "summarize-content-results",
                            assistantPurpose: "automation",
                            assistantId: state.aiAssistantId || undefined,
                            prompt: "Summarize connector results for operator actionability.",
                            summary: { count: state.lastResults.length },
                            context: { results: state.lastResults.slice(0, 20) },
                        });
                        assertOk(response, "AI summarize failed.");
                        const message = response && typeof response === "object"
                            ? (typeof (response as { message?: unknown }).message === "string"
                                ? String((response as { message: string }).message).trim()
                                : "")
                            : "";
                        if (!message) throw new Error("AI response was empty.");
                        setText("sh-output", `${message}\n\n---\n${String(byId("sh-output")?.textContent || "")}`);
                        setText("sh-meta", "AI summary generated.");
                        notifySuccess("AI summary generated");
                    },
                };
                (window as {
                    __serviceHubRunAction?: (action: string) => Promise<void>;
                    __serviceHubRuntime?: Record<string, (...args: unknown[]) => Promise<void>> & {
                        setBusy?: (value: boolean) => void;
                        setMeta?: (value: string) => void;
                    };
                    Notyf?: new (options?: unknown) => { error: (value: string) => void };
                }).__serviceHubRunAction = async (action: string) => {
                    const runtime = (window as {
                        __serviceHubRuntime?: Record<string, (...args: unknown[]) => Promise<void>> & {
                            setBusy?: (value: boolean) => void;
                            setMeta?: (value: string) => void;
                        };
                    }).__serviceHubRuntime;
                    if (!runtime || typeof runtime[action] !== "function") {
                        return;
                    }
                    runtime.setBusy?.(true);
                    try {
                        await runtime[action]();
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        runtime.setMeta?.(`${action} failed: ${message}`);
                        const runtimeWindow = window as {
                            Notyf?: new (options?: unknown) => { error: (value: string) => void };
                        };
                        if (typeof runtimeWindow.Notyf === "function") {
                            new runtimeWindow.Notyf({ duration: 3000, position: { x: "right", y: "top" } }).error(message);
                        }
                    } finally {
                        runtime.setBusy?.(false);
                    }
                };

                void (async () => {
                    const runtime = (window as { __serviceHubRuntime?: { prepare?: () => Promise<void> } }).__serviceHubRuntime;
                    if (runtime?.prepare) {
                        await runtime.prepare();
                    }
                })().catch((error) => {
                    setText("sh-meta", `Runtime prepare failed: ${error instanceof Error ? error.message : String(error)}`);
                });
            },
            handlers: {
                saveContext: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("saveContext"),
                authStart: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("authStart"),
                nativeMicrosoftLogin: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("nativeMicrosoftLogin"),
                authRefresh: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("authRefresh"),
                authLogout: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("authLogout"),
                listWorkspaces: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("listWorkspaces"),
                listItems: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("listItems"),
                nextPage: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("nextPage"),
                searchItems: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("searchItems"),
                createShareLink: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("createShareLink"),
                openInBrowser: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("openInBrowser"),
                copyShareLink: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("copyShareLink"),
                addFavorite: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("addFavorite"),
                summarizeWithAI: async () => (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("summarizeWithAI"),
                searchOnEnter: async ({ event }: { event: unknown }) => {
                    const keyEvent = event as KeyboardEvent;
                    if (!keyEvent || typeof keyEvent.key !== "string" || keyEvent.key !== "Enter") {
                        return;
                    }
                    keyEvent.preventDefault();
                    await (window as { __serviceHubRunAction?: (action: string) => Promise<void> }).__serviceHubRunAction?.("searchItems");
                },
            },
            bindings: [
                { selector: "#sh-save-context", event: "click", handler: "saveContext", required: true, preventDefault: true },
                { selector: "#sh-ms-login", event: "click", handler: "nativeMicrosoftLogin", required: true, preventDefault: true },
                { selector: "#sh-auth-refresh", event: "click", handler: "authRefresh", required: true, preventDefault: true },
                { selector: "#sh-auth-logout", event: "click", handler: "authLogout", required: true, preventDefault: true },
                { selector: "#sh-list-workspaces", event: "click", handler: "listWorkspaces", required: true, preventDefault: true },
                { selector: "#sh-list-items", event: "click", handler: "listItems", required: true, preventDefault: true },
                { selector: "#sh-next-page", event: "click", handler: "nextPage", required: true, preventDefault: true },
                { selector: "#sh-search-items", event: "click", handler: "searchItems", required: true, preventDefault: true },
                { selector: "#sh-create-share-link", event: "click", handler: "createShareLink", required: true, preventDefault: true },
                { selector: "#sh-open-browser", event: "click", handler: "openInBrowser", required: true, preventDefault: true },
                { selector: "#sh-copy-share-link", event: "click", handler: "copyShareLink", required: true, preventDefault: true },
                { selector: "#sh-add-favorite", event: "click", handler: "addFavorite", required: true, preventDefault: true },
                { selector: "#sh-ai-summarize", event: "click", handler: "summarizeWithAI", required: true, preventDefault: true },
                { selector: "#sh-search-query", event: "keydown", handler: "searchOnEnter" },
            ],
            strict: true,
            language: "typescript",
            description: "Declarative runtime wiring for generic auth/content broker interactions.",
        });
    }

    private ensurePersistentStore(): void {
        if (this.persistentStore) {
            return;
        }
        try {
            this.persistentStore = PluginRegistry.useStore("json");
            this.jsonStoreAvailable = true;
        } catch {
            this.jsonStoreAvailable = false;
        }
    }

    private getFallbackStore(): StoreType {
        if (!this.sessionStore) {
            this.sessionStore = PluginRegistry.useStore("default");
        }
        return this.sessionStore;
    }

    private readState<T>(key: string, fallback: T): T {
        this.ensurePersistentStore();
        const store = this.persistentStore ?? this.getFallbackStore();
        const value = store.get(key) as T | undefined;
        return value === undefined ? fallback : value;
    }

    private writeState<T>(key: string, value: T): "persistent-json" | "session-fallback" {
        this.ensurePersistentStore();
        const store = this.persistentStore ?? this.getFallbackStore();
        store.set(key, value);
        return this.persistentStore ? "persistent-json" : "session-fallback";
    }

    private getGrantedCapabilities(): PluginCapability[] {
        try {
            const diagnostics = PluginRegistry.getDiagnostics({ notificationsLimit: 0 });
            const granted = diagnostics?.capabilities?.permissions?.granted;
            return Array.isArray(granted) ? granted as PluginCapability[] : [];
        } catch {
            return [];
        }
    }

    private requireConnectorNetwork(action: string): void {
        requireCapability("system.network", action);
        requireCapability("system.network.https", action);
        requireNetworkScopeCapability(ServiceContentHubPlugin.NETWORK_SCOPE_ID, action);
    }

    private normalizeContext(input: unknown): ServiceContext {
        const payload = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
        const persisted = this.readState<ServiceContext>(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, DEFAULT_CONTEXT);
        const authConfig = payload.authConfig && typeof payload.authConfig === "object"
            ? payload.authConfig as Record<string, unknown>
            : {};
        const providerId = typeof payload.providerId === "string" && payload.providerId.trim()
            ? payload.providerId.trim()
            : (persisted.providerId || "sharepoint");
        const endpointUrlRaw = typeof payload.endpointUrl === "string"
            ? payload.endpointUrl.trim()
            : (persisted.endpointUrl || "");
        const authTenantId = (
            typeof authConfig.tenantId === "string" && authConfig.tenantId.trim()
                ? authConfig.tenantId.trim()
                : (typeof payload.authTenantId === "string" && payload.authTenantId.trim()
                    ? payload.authTenantId.trim()
                    : (persisted.authTenantId || ""))
        ) || ServiceContentHubPlugin.DEFAULT_AUTH_TENANT;
        const authScopes = (
            typeof authConfig.scopes === "string" && authConfig.scopes.trim()
                ? authConfig.scopes.trim()
                : (typeof payload.authScopes === "string" && payload.authScopes.trim()
                    ? payload.authScopes.trim()
                    : (persisted.authScopes || ""))
        ) || ServiceContentHubPlugin.DEFAULT_AUTH_SCOPES;
        return {
            providerId,
            accountId: typeof payload.accountId === "string"
                ? payload.accountId.trim()
                : (persisted.accountId || ""),
            sessionId: typeof payload.sessionId === "string"
                ? payload.sessionId.trim()
                : (persisted.sessionId || ""),
            endpointUrl: endpointUrlRaw || this.getDefaultEndpointUrl(providerId),
            workspaceId: typeof payload.workspaceId === "string"
                ? payload.workspaceId.trim()
                : (persisted.workspaceId || ""),
            path: typeof payload.path === "string" && payload.path.trim()
                ? payload.path.trim()
                : (persisted.path || "/"),
            authClientId: typeof authConfig.clientId === "string"
                ? authConfig.clientId.trim()
                : (typeof payload.authClientId === "string"
                    ? payload.authClientId.trim()
                    : (persisted.authClientId || "")),
            authTenantId,
            authRedirectUri: typeof authConfig.redirectUri === "string"
                ? authConfig.redirectUri.trim()
                : (typeof payload.authRedirectUri === "string"
                    ? payload.authRedirectUri.trim()
                    : (persisted.authRedirectUri || "")),
            authScopes,
            authDeviceCode: typeof payload.authDeviceCode === "string"
                ? payload.authDeviceCode.trim()
                : (persisted.authDeviceCode || ""),
            authVerificationUri: typeof payload.authVerificationUri === "string"
                ? payload.authVerificationUri.trim()
                : (persisted.authVerificationUri || ""),
            authVerificationUriComplete: typeof payload.authVerificationUriComplete === "string"
                ? payload.authVerificationUriComplete.trim()
                : (persisted.authVerificationUriComplete || ""),
            authUserCode: typeof payload.authUserCode === "string"
                ? payload.authUserCode.trim()
                : (persisted.authUserCode || ""),
            authPollIntervalSeconds: Number.isFinite(Number(payload.authPollIntervalSeconds))
                ? Number(payload.authPollIntervalSeconds)
                : (Number.isFinite(Number(persisted.authPollIntervalSeconds)) ? Number(persisted.authPollIntervalSeconds) : 5),
            authCodeExpiresAt: typeof payload.authCodeExpiresAt === "string"
                ? payload.authCodeExpiresAt.trim()
                : (persisted.authCodeExpiresAt || ""),
        };
    }

    private getDefaultEndpointUrl(providerIdRaw: string): string {
        const providerId = providerIdRaw.trim().toLowerCase();
        return ServiceContentHubPlugin.PROVIDER_ENDPOINT_DEFAULTS[providerId] || "";
    }

    private normalizeItems(input: unknown): ContentItem[] {
        const source: unknown[] = Array.isArray(input)
            ? input
            : (
                Array.isArray((input as { items?: unknown[] })?.items)
                    ? (input as { items: unknown[] }).items
                    : (Array.isArray((input as { value?: unknown[] })?.value) ? (input as { value: unknown[] }).value : [])
            );
        return source
            .map((candidate): ContentItem | null => {
                if (!candidate || typeof candidate !== "object") return null;
                const record = candidate as Record<string, unknown>;
                const id = typeof record.id === "string" ? record.id.trim() : "";
                const name = typeof record.name === "string"
                    ? record.name.trim()
                    : (typeof record.displayName === "string" ? String(record.displayName).trim() : "");
                if (!id || !name) return null;
                const kind = typeof record.kind === "string" ? record.kind.trim().toLowerCase() : "file";
                return {
                    id,
                    name,
                    kind: kind === "site" || kind === "workspace" || kind === "folder" || kind === "file" ? kind : "file",
                    webUrl: typeof record.webUrl === "string" ? record.webUrl.trim() : "",
                    parentPath: typeof record.parentPath === "string" ? record.parentPath.trim() : undefined,
                    lastModifiedAt: typeof record.lastModifiedAt === "string" ? record.lastModifiedAt.trim() : undefined,
                };
            })
            .filter((item): item is ContentItem => Boolean(item))
            .slice(0, 500);
    }

    private normalizeCursor(input: unknown): string {
        if (typeof (input as { cursor?: unknown })?.cursor === "string") {
            return String((input as { cursor: string }).cursor).trim();
        }
        return "";
    }

    private readResponseCursor(input: unknown): string {
        if (!input || typeof input !== "object") {
            return "";
        }
        if (typeof (input as { ["@odata.nextLink"]?: unknown })["@odata.nextLink"] === "string") {
            return String((input as { ["@odata.nextLink"]: string })["@odata.nextLink"]).trim();
        }
        if (typeof (input as { nextCursor?: unknown }).nextCursor === "string") {
            return String((input as { nextCursor: string }).nextCursor).trim();
        }
        const page = (input as { page?: { nextCursor?: unknown } }).page;
        if (page && typeof page.nextCursor === "string") {
            return page.nextCursor.trim();
        }
        return "";
    }

    private getCorrelationId(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    private buildSharePointDeviceCodeStartRequest(context: ServiceContext): {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string;
    } | null {
        if (context.providerId.trim().toLowerCase() !== "sharepoint" || !context.authClientId) {
            return null;
        }
        const tenantId = context.authTenantId || ServiceContentHubPlugin.DEFAULT_AUTH_TENANT;
        const body = new URLSearchParams();
        body.set("client_id", context.authClientId);
        body.set("scope", context.authScopes || ServiceContentHubPlugin.DEFAULT_AUTH_SCOPES);
        return {
            url: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/devicecode`,
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        };
    }

    private buildSharePointDeviceCodeRefreshRequest(context: ServiceContext): {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string;
    } | null {
        if (context.providerId.trim().toLowerCase() !== "sharepoint" || !context.authClientId || !context.authDeviceCode) {
            return null;
        }
        const tenantId = context.authTenantId || ServiceContentHubPlugin.DEFAULT_AUTH_TENANT;
        const body = new URLSearchParams();
        body.set("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
        body.set("client_id", context.authClientId);
        body.set("device_code", context.authDeviceCode);
        return {
            url: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        };
    }

    private readDeviceCodeDetails(result: unknown): {
        verificationUri: string;
        verificationUriComplete: string;
        userCode: string;
        deviceCode: string;
        message: string;
        intervalSeconds: number;
        expiresInSeconds: number;
    } {
        const record = result && typeof result === "object" ? result as Record<string, unknown> : {};
        const raw = record.raw && typeof record.raw === "object" ? record.raw as Record<string, unknown> : {};
        const pickString = (...values: unknown[]) => {
            const candidate = values.find((value) => typeof value === "string" && String(value).trim());
            return typeof candidate === "string" ? candidate.trim() : "";
        };
        const pickNumber = (...values: unknown[]) => {
            const candidate = values.find((value) => Number.isFinite(Number(value)));
            return candidate === undefined ? 0 : Number(candidate);
        };
        return {
            verificationUri: pickString(record.verificationUri, raw.verification_uri, raw.verificationUri, raw.verification_url, raw.verificationUrl),
            verificationUriComplete: pickString(record.verificationUriComplete, raw.verification_uri_complete, raw.verificationUriComplete),
            userCode: pickString(record.userCode, raw.user_code, raw.userCode),
            deviceCode: pickString(record.deviceCode, raw.device_code, raw.deviceCode),
            message: pickString(record.message, raw.message),
            intervalSeconds: pickNumber(record.intervalSeconds, raw.interval, raw.intervalSeconds) || 5,
            expiresInSeconds: pickNumber(record.expiresInSeconds, raw.expires_in, raw.expiresIn),
        };
    }

    private readExplicitSessionCredentials(result: unknown): null | {
        auth: {
            scheme: "bearer";
            value: string;
        };
        credentials: {
            accessToken: string;
            refreshToken?: string;
            idToken?: string;
            tokenType: string;
            scope?: string;
            expiresAt?: string;
        };
    } {
        const record = result && typeof result === "object" ? result as Record<string, unknown> : {};
        const raw = record.raw && typeof record.raw === "object" ? record.raw as Record<string, unknown> : {};
        const accessToken = typeof raw.access_token === "string" && raw.access_token.trim()
            ? raw.access_token.trim()
            : (typeof raw.accessToken === "string" && raw.accessToken.trim() ? raw.accessToken.trim() : "");
        if (!accessToken) {
            return null;
        }
        const refreshToken = typeof raw.refresh_token === "string" && raw.refresh_token.trim()
            ? raw.refresh_token.trim()
            : (typeof raw.refreshToken === "string" && raw.refreshToken.trim() ? raw.refreshToken.trim() : "");
        const idToken = typeof raw.id_token === "string" && raw.id_token.trim()
            ? raw.id_token.trim()
            : (typeof raw.idToken === "string" && raw.idToken.trim() ? raw.idToken.trim() : "");
        const tokenType = typeof raw.token_type === "string" && raw.token_type.trim()
            ? raw.token_type.trim()
            : (typeof raw.tokenType === "string" && raw.tokenType.trim() ? raw.tokenType.trim() : "Bearer");
        const scope = typeof raw.scope === "string" && raw.scope.trim() ? raw.scope.trim() : "";
        const expiresInCandidate = Number(
            typeof raw.expires_in === "number" || typeof raw.expires_in === "string"
                ? raw.expires_in
                : raw.expiresIn
        );
        const expiresAt = Number.isFinite(expiresInCandidate) && expiresInCandidate > 0
            ? new Date(Date.now() + expiresInCandidate * 1000).toISOString()
            : "";
        return {
            auth: {
                scheme: "bearer",
                value: accessToken,
            },
            credentials: {
                accessToken,
                refreshToken: refreshToken || undefined,
                idToken: idToken || undefined,
                tokenType: tokenType || "Bearer",
                scope: scope || undefined,
                expiresAt: expiresAt || undefined,
            },
        };
    }

    private readAuthSessionId(result: unknown): string {
        if (!result || typeof result !== "object") {
            return "";
        }
        const record = result as Record<string, unknown>;
        const direct = [
            record.sessionId,
            record.session_id,
            record.sid,
        ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
        if (typeof direct === "string") {
            return direct.trim();
        }
        const raw = record.raw;
        if (raw && typeof raw === "object") {
            const nestedDirect = [
                (raw as Record<string, unknown>).sessionId,
                (raw as Record<string, unknown>).session_id,
                (raw as Record<string, unknown>).sid,
            ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
            if (typeof nestedDirect === "string") {
                return nestedDirect.trim();
            }
        }
        const nested = record.session;
        if (nested && typeof nested === "object" && typeof (nested as { id?: unknown }).id === "string") {
            return String((nested as { id: string }).id).trim();
        }
        if (raw && typeof raw === "object") {
            const nestedRaw = (raw as Record<string, unknown>).session;
            if (nestedRaw && typeof nestedRaw === "object" && typeof (nestedRaw as { id?: unknown }).id === "string") {
                return String((nestedRaw as { id: string }).id).trim();
            }
        }
        return "";
    }

    private readAuthRedirectUrl(result: unknown): string {
        if (!result || typeof result !== "object") {
            return "";
        }
        const record = result as Record<string, unknown>;
        const direct = [
            record.authorizationUrl,
            record.authorization_url,
            record.authorizeUrl,
            record.authorize_url,
            record.authUrl,
            record.auth_url,
            record.loginUrl,
            record.login_url,
            record.redirectUrl,
            record.redirect_url,
            record.verificationUri,
            record.verification_uri,
            record.verificationUrl,
            record.verification_url,
            record.webUrl,
            record.url,
        ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
        if (typeof direct === "string") {
            return direct.trim();
        }
        const raw = record.raw;
        if (raw && typeof raw === "object") {
            const rawRecord = raw as Record<string, unknown>;
            const nestedDirect = [
                rawRecord.authorizationUrl,
                rawRecord.authorization_url,
                rawRecord.authorizeUrl,
                rawRecord.authorize_url,
                rawRecord.authUrl,
                rawRecord.auth_url,
                rawRecord.loginUrl,
                rawRecord.login_url,
                rawRecord.redirectUrl,
                rawRecord.redirect_url,
                rawRecord.verificationUri,
                rawRecord.verification_uri,
                rawRecord.verificationUrl,
                rawRecord.verification_url,
                rawRecord.webUrl,
                rawRecord.url,
            ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
            if (typeof nestedDirect === "string") {
                return nestedDirect.trim();
            }
        }
        const authBlock = record.auth;
        if (authBlock && typeof authBlock === "object") {
            const nested = [
                (authBlock as Record<string, unknown>).authorizationUrl,
                (authBlock as Record<string, unknown>).authorizeUrl,
                (authBlock as Record<string, unknown>).authUrl,
                (authBlock as Record<string, unknown>).loginUrl,
                (authBlock as Record<string, unknown>).redirectUrl,
                (authBlock as Record<string, unknown>).url,
            ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
            if (typeof nested === "string") {
                return nested.trim();
            }
        }
        if (raw && typeof raw === "object") {
            const rawAuthBlock = (raw as Record<string, unknown>).auth;
            if (rawAuthBlock && typeof rawAuthBlock === "object") {
                const nestedRaw = [
                    (rawAuthBlock as Record<string, unknown>).authorizationUrl,
                    (rawAuthBlock as Record<string, unknown>).authorizeUrl,
                    (rawAuthBlock as Record<string, unknown>).authUrl,
                    (rawAuthBlock as Record<string, unknown>).loginUrl,
                    (rawAuthBlock as Record<string, unknown>).redirectUrl,
                    (rawAuthBlock as Record<string, unknown>).url,
                ].find((candidate) => typeof candidate === "string" && String(candidate).trim());
                if (typeof nestedRaw === "string") {
                    return nestedRaw.trim();
                }
            }
        }
        return "";
    }

    private validateEndpointUrl(endpointUrl: string): { ok: true } | { ok: false; code: string; error: string } {
        if (!endpointUrl) {
            return { ok: true };
        }
        try {
            const parsed = new URL(endpointUrl);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                return { ok: false, code: "ENDPOINT_URL_INVALID", error: "Endpoint URL must use http or https." };
            }
            return { ok: true };
        } catch {
            return { ok: false, code: "ENDPOINT_URL_INVALID", error: "Endpoint URL must be a valid absolute URL." };
        }
    }

    private classifyBrokerError(error: unknown, fallbackCode: string): { code: string; message: string } {
        const message = error instanceof Error ? error.message : String(error || "");
        const normalized = message.toLowerCase();
        if (/token.*expired|session.*expired|invalid.*token/.test(normalized)) {
            return { code: "AUTH_TOKEN_EXPIRED", message };
        }
        if (/consent|scope|permission.*denied|forbidden|403/.test(normalized)) {
            return { code: "AUTH_SCOPE_DENIED", message };
        }
        if (/auth.*required|401|unauthorized|login required/.test(normalized)) {
            return { code: "AUTH_REQUIRED", message };
        }
        if (/throttl|429|temporar|timeout|econnreset|503|502|504|500/.test(normalized)) {
            return { code: "PROVIDER_TRANSIENT", message };
        }
        return { code: fallbackCode, message };
    }

    private augmentSharePointAuthStartError(context: ServiceContext, message: string): string {
        const normalized = String(message || "").toLowerCase();
        if (!/auth_upstream_http_400|status 400|invalid_scope|unauthorized_client|invalid_request/.test(normalized)) {
            return message;
        }
        const hints: string[] = [];
        if (!context.authClientId) {
            hints.push('set "SharePoint App (client) ID"');
        }
        if (!context.authTenantId || context.authTenantId === "common" || context.authTenantId === "organizations") {
            hints.push('use your real tenant ID or tenant domain instead of "common"/"organizations" for a single-tenant app');
        }
        hints.push("enable Public client/native access in the Microsoft app registration");
        hints.push("add delegated Microsoft Graph permissions User.Read, Files.Read.All, and Sites.Read.All");
        return `${message} SharePoint device-code checklist: ${hints.join("; ")}.`;
    }

    private shouldRetryBrokerError(error: unknown): boolean {
        const { code } = this.classifyBrokerError(error, "UNKNOWN");
        return code === "PROVIDER_TRANSIENT";
    }

    private resolveAuthBroker(): AuthBroker | null {
        const globalRecord = globalThis as {
            __FDO_AUTH_BROKER?: unknown;
            __FDO_CONNECTOR_AUTH?: unknown;
        };
        const broker = globalRecord.__FDO_AUTH_BROKER ?? globalRecord.__FDO_CONNECTOR_AUTH;
        return broker && typeof broker === "object" ? broker as AuthBroker : null;
    }

    private resolveContentBroker(): ContentBroker | null {
        const globalRecord = globalThis as {
            __FDO_CONTENT_BROKER?: unknown;
            __FDO_CONNECTOR_CONTENT?: unknown;
            __FDO_SHAREPOINT_PROVIDER?: unknown;
            __FDO_SHAREPOINT?: unknown;
        };
        const broker = globalRecord.__FDO_CONTENT_BROKER
            ?? globalRecord.__FDO_CONNECTOR_CONTENT
            ?? globalRecord.__FDO_SHAREPOINT_PROVIDER
            ?? globalRecord.__FDO_SHAREPOINT;
        return broker && typeof broker === "object" ? broker as ContentBroker : null;
    }

    private resolveOpenUrlBroker(): OpenUrlBroker | null {
        const globalRecord = globalThis as {
            __FDO_BROWSER_BROKER?: unknown;
            __FDO_OPEN_EXTERNAL?: unknown;
        };
        const broker = globalRecord.__FDO_BROWSER_BROKER ?? globalRecord.__FDO_OPEN_EXTERNAL;
        return broker && typeof broker === "object" ? broker as OpenUrlBroker : null;
    }

    private resolveSessionRequestBroker(): SessionRequestBroker | null {
        const globalRecord = globalThis as {
            __FDO_SESSION_REQUEST?: unknown;
        };
        const broker = globalRecord.__FDO_SESSION_REQUEST;
        return broker && typeof broker === "object" ? broker as SessionRequestBroker : null;
    }

    private async callBroker<TInput extends Record<string, unknown>>(broker: unknown, methodName: string, input: TInput): Promise<unknown> {
        const method = broker && typeof broker === "object" ? (broker as Record<string, unknown>)[methodName] : undefined;
        if (typeof method !== "function") {
            throw new Error(`Host broker method "${methodName}" is not available.`);
        }
        const result = (method as (payload: TInput) => unknown)(input);
        if (result && typeof (result as Promise<unknown>).then === "function") {
            return result as Promise<unknown>;
        }
        return result;
    }

    private async callBrokerWithRetry<TInput extends Record<string, unknown>>(
        broker: unknown,
        methodName: string,
        input: TInput,
        retries = 2
    ): Promise<unknown> {
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                return await this.callBroker(broker, methodName, input);
            } catch (error) {
                if (attempt >= retries || !this.shouldRetryBrokerError(error)) {
                    throw error;
                }
                await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
            }
        }
        return null;
    }

    private async callContentOperation(
        broker: ContentBroker | null,
        operation: "list-workspaces" | "list-items" | "search-items" | "create-share-link",
        input: {
            providerId: string;
            sessionId: string;
            endpointUrl?: string;
            workspaceId?: string;
            path?: string;
            query?: string;
            itemId?: string;
            scope?: "organization" | "anonymous";
            type?: "view" | "edit";
            limit?: number;
            cursor?: string;
        }
    ): Promise<unknown> {
        const providerId = String(input.providerId || "").trim().toLowerCase();
        const payload = {
            ...input,
            operation,
        };
        if (broker && typeof broker.request === "function") {
            return this.callBrokerWithRetry(broker, "request", payload);
        }
        if (broker && typeof broker.invoke === "function") {
            return this.callBrokerWithRetry(broker, "invoke", payload);
        }
        const legacyMap: Record<string, string> = {
            "list-workspaces": "listWorkspaces",
            "list-items": "listItems",
            "search-items": "search",
            "create-share-link": "createShareLink",
        };
        if (broker) {
            return this.callBrokerWithRetry(broker, legacyMap[operation], input);
        }
        if (providerId === "sharepoint") {
            const sessionBroker = this.resolveSessionRequestBroker();
            return this.callSharePointContentViaSessionRequest(sessionBroker, operation, input);
        }
        throw new Error(`Content broker is not available for provider "${providerId || "unknown"}".`);
    }

    private async callSharePointContentViaSessionRequest(
        broker: SessionRequestBroker | null,
        operation: "list-workspaces" | "list-items" | "search-items" | "create-share-link",
        input: {
            providerId: string;
            sessionId: string;
            endpointUrl?: string;
            workspaceId?: string;
            path?: string;
            query?: string;
            itemId?: string;
            scope?: "organization" | "anonymous";
            type?: "view" | "edit";
            limit?: number;
            cursor?: string;
        }
    ): Promise<unknown> {
        if (!broker || typeof broker.request !== "function") {
            throw new Error(
                "Host content broker is unavailable and __FDO_SESSION_REQUEST.request is not exposed for SharePoint fallback."
            );
        }
        const base = String(input.endpointUrl || "").trim().replace(/\/+$/, "");
        if (!base) {
            throw new Error("SharePoint fallback requires endpointUrl.");
        }
        if (!input.sessionId) {
            throw new Error("SharePoint fallback requires sessionId.");
        }
        if (operation === "list-workspaces") {
            const searchQuery = String(input.query || "").trim();
            if (input.cursor && String(input.cursor).trim()) {
                const response = await this.callBrokerWithRetry(broker, "request", {
                    sessionId: input.sessionId,
                    method: "GET",
                    url: String(input.cursor).trim(),
                });
                const data = response && typeof response === "object" ? (response as { data?: unknown }).data : response;
                return {
                    items: Array.isArray((data as { value?: unknown[] })?.value) ? (data as { value: unknown[] }).value : [],
                    nextCursor: typeof (data as { ["@odata.nextLink"]?: unknown })?.["@odata.nextLink"] === "string"
                        ? String((data as { ["@odata.nextLink"]: string })["@odata.nextLink"]).trim()
                        : "",
                };
            }
            if (searchQuery) {
                const response = await this.callBrokerWithRetry(broker, "request", {
                    sessionId: input.sessionId,
                    method: "GET",
                    url: `${base}/sites`,
                    query: {
                        search: searchQuery,
                        $top: input.limit || 100,
                    },
                });
                const data = response && typeof response === "object" ? (response as { data?: unknown }).data : response;
                return {
                    items: Array.isArray((data as { value?: unknown[] })?.value) ? (data as { value: unknown[] }).value : [],
                    nextCursor: typeof (data as { ["@odata.nextLink"]?: unknown })?.["@odata.nextLink"] === "string"
                        ? String((data as { ["@odata.nextLink"]: string })["@odata.nextLink"]).trim()
                        : "",
                };
            }
            if (input.workspaceId) {
                const encodedSiteId = encodeURIComponent(input.workspaceId);
                const response = await this.callBrokerWithRetry(broker, "request", {
                    sessionId: input.sessionId,
                    method: "GET",
                    url: `${base}/sites/${encodedSiteId}`,
                });
                const data = response && typeof response === "object" ? (response as { data?: unknown }).data : response;
                return {
                    items: data && typeof data === "object" ? [data as Record<string, unknown>] : [],
                    nextCursor: "",
                };
            }
            throw new Error("SharePoint workspace discovery requires either a search query or a SharePoint Site ID.");
        }
        if (operation === "list-items") {
            if (!input.workspaceId) {
                throw new Error("SharePoint list-items fallback requires workspaceId (site id).");
            }
            const encodedSiteId = encodeURIComponent(input.workspaceId);
            const url = input.cursor && String(input.cursor).trim()
                ? String(input.cursor).trim()
                : `${base}/sites/${encodedSiteId}/drive/root/children`;
            const response = await this.callBrokerWithRetry(broker, "request", {
                sessionId: input.sessionId,
                method: "GET",
                url,
                query: input.cursor ? undefined : { $top: input.limit || 300 },
            });
            const data = response && typeof response === "object" ? (response as { data?: unknown }).data : response;
            return {
                items: Array.isArray((data as { value?: unknown[] })?.value) ? (data as { value: unknown[] }).value : [],
                nextCursor: typeof (data as { ["@odata.nextLink"]?: unknown })?.["@odata.nextLink"] === "string"
                    ? String((data as { ["@odata.nextLink"]: string })["@odata.nextLink"]).trim()
                    : "",
            };
        }
        if (operation === "search-items") {
            const url = input.cursor && String(input.cursor).trim() ? String(input.cursor).trim() : `${base}/sites`;
            const response = await this.callBrokerWithRetry(broker, "request", {
                sessionId: input.sessionId,
                method: "GET",
                url,
                query: input.cursor ? undefined : {
                    search: input.query || "*",
                    $top: input.limit || 300,
                },
            });
            const data = response && typeof response === "object" ? (response as { data?: unknown }).data : response;
            return {
                items: Array.isArray((data as { value?: unknown[] })?.value) ? (data as { value: unknown[] }).value : [],
                nextCursor: typeof (data as { ["@odata.nextLink"]?: unknown })?.["@odata.nextLink"] === "string"
                    ? String((data as { ["@odata.nextLink"]: string })["@odata.nextLink"]).trim()
                    : "",
            };
        }
        if (operation === "create-share-link") {
            throw new Error("SharePoint share-link fallback requires a host content broker implementation.");
        }
        throw new Error(`Unsupported SharePoint fallback operation "${operation}".`);
    }

    private appendRecentActivity(action: string, detail: string): void {
        const current = this.readState<Array<{ id: string; action: string; detail: string; at: string }>>(
            ServiceContentHubPlugin.STORAGE_KEYS.RECENT_ACTIVITY,
            []
        );
        current.unshift({
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            action,
            detail,
            at: new Date().toISOString(),
        });
        this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.RECENT_ACTIVITY, current.slice(0, 80));
    }

    private registerHandlers(): void {
        if (this.handlersRegistered) {
            return;
        }
        this.handlersRegistered = true;

        PluginRegistry.registerHandler(ServiceContentHubPlugin.PREPARE_HANDLER, () => ({
            ok: true,
            context: this.readState<ServiceContext>(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, DEFAULT_CONTEXT),
            favorites: this.readState<ContentItem[]>(ServiceContentHubPlugin.STORAGE_KEYS.FAVORITES, []),
            recentActivity: this.readState<Array<{ id: string; action: string; detail: string; at: string }>>(
                ServiceContentHubPlugin.STORAGE_KEYS.RECENT_ACTIVITY,
                []
            ),
            cursor: this.readState<string>(ServiceContentHubPlugin.STORAGE_KEYS.LAST_CURSOR, ""),
            storageMode: this.jsonStoreAvailable ? "persistent-json" : "session-fallback",
        }));

        PluginRegistry.registerHandler(ServiceContentHubPlugin.SAVE_CONTEXT_HANDLER, (data: unknown) => {
            const context = this.normalizeContext(data);
            if (!context.providerId) {
                return { ok: false, code: "CONTEXT_INVALID", error: "Provider ID is required." };
            }
            const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
            if (!endpointValidation.ok) {
                return { ok: false, code: endpointValidation.code, error: endpointValidation.error };
            }
            const persistence = this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, context);
            this.appendRecentActivity("save-context", `${context.providerId}${context.accountId ? ` · ${context.accountId}` : ""}`);
            return { ok: true, context, persistence };
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.AUTH_START_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("auth-start");
            const context = this.normalizeContext(data);
            try {
                this.requireConnectorNetwork("start host auth session");
                const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const broker = this.resolveAuthBroker();
                const authStartInput: Record<string, unknown> = {
                    providerId: context.providerId,
                    accountHint: context.accountId || undefined,
                    endpointUrl: context.endpointUrl || undefined,
                };
                const sharePointDeviceCodeRequest = this.buildSharePointDeviceCodeStartRequest(context);
                if (sharePointDeviceCodeRequest) {
                    authStartInput.request = sharePointDeviceCodeRequest;
                    authStartInput.endpointUrl = sharePointDeviceCodeRequest.url;
                }
                const result = await this.callBroker(broker, "start", authStartInput);
                if (result && typeof result === "object" && (result as { ok?: unknown }).ok === false) {
                    const errorRecord = result as { code?: unknown; error?: unknown };
                    return {
                        ok: false,
                        code: typeof errorRecord.code === "string" ? errorRecord.code : "AUTH_START_FAILED",
                        error: this.augmentSharePointAuthStartError(
                            context,
                            typeof errorRecord.error === "string" ? errorRecord.error : "Auth start failed."
                        ),
                        correlationId,
                    };
                }
                const sessionId = this.readAuthSessionId(result);
                const normalizedAuthorizationUrl = this.readAuthRedirectUrl(result);
                const deviceCode = this.readDeviceCodeDetails(result);
                const resultRecord = result && typeof result === "object" ? result as Record<string, unknown> : {};
                const hasAuthTxnEnvelope = typeof resultRecord.authTxnId === "string" && resultRecord.authTxnId.trim().length > 0;
                const envelopeRawMissing = hasAuthTxnEnvelope && (!("raw" in resultRecord) || resultRecord.raw == null);
                if (deviceCode.verificationUri || deviceCode.verificationUriComplete) {
                    const pendingContext = {
                        ...context,
                        sessionId: sessionId || context.sessionId,
                        accountId: typeof (result as { accountId?: unknown })?.accountId === "string"
                            ? String((result as { accountId: string }).accountId).trim()
                            : context.accountId,
                        authDeviceCode: deviceCode.deviceCode,
                        authVerificationUri: deviceCode.verificationUri,
                        authVerificationUriComplete: deviceCode.verificationUriComplete,
                        authUserCode: deviceCode.userCode,
                        authPollIntervalSeconds: deviceCode.intervalSeconds,
                        authCodeExpiresAt: deviceCode.expiresInSeconds > 0
                            ? new Date(Date.now() + deviceCode.expiresInSeconds * 1000).toISOString()
                            : "",
                    };
                    this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, pendingContext);
                    this.appendRecentActivity("auth-start", `${context.providerId} · device code issued`);
                    return {
                        ok: true,
                        pending: true,
                        ...pendingContext,
                        verificationUri: deviceCode.verificationUri,
                        verificationUriComplete: deviceCode.verificationUriComplete,
                        userCode: deviceCode.userCode,
                        message: deviceCode.message,
                        authTxnId: hasAuthTxnEnvelope ? String(resultRecord.authTxnId) : undefined,
                        correlationId,
                    };
                }
                if (normalizedAuthorizationUrl) {
                    const authUrlValidation = this.validateEndpointUrl(normalizedAuthorizationUrl);
                    if (!authUrlValidation.ok) {
                        return {
                            ok: false,
                            code: authUrlValidation.code,
                            error: `Auth authorization URL invalid: ${authUrlValidation.error}`,
                            correlationId,
                        };
                    }
                    const pendingContext = {
                        ...context,
                        sessionId: sessionId || context.sessionId,
                        accountId: typeof (result as { accountId?: unknown })?.accountId === "string"
                            ? String((result as { accountId: string }).accountId).trim()
                            : context.accountId,
                    };
                    this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, pendingContext);
                    this.appendRecentActivity("auth-start", `${context.providerId} · redirect pending`);
                    return {
                        ok: true,
                        pending: true,
                        ...pendingContext,
                        authorizationUrl: normalizedAuthorizationUrl,
                        authTxnId: hasAuthTxnEnvelope ? String(resultRecord.authTxnId) : undefined,
                        correlationId,
                    };
                }
                if (envelopeRawMissing && sessionId) {
                    const pendingContext = {
                        ...context,
                        sessionId,
                        accountId: typeof (result as { accountId?: unknown })?.accountId === "string"
                            ? String((result as { accountId: string }).accountId).trim()
                            : context.accountId,
                    };
                    this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, pendingContext);
                    this.appendRecentActivity("auth-start", `${context.providerId} · auth txn started (awaiting follow-up)`);
                    return {
                        ok: true,
                        pending: true,
                        ...pendingContext,
                        authHint: context.providerId.trim().toLowerCase() === "sharepoint"
                            ? "Device-code flow requires a Microsoft app registration with Public client/native access enabled."
                            : "Provider-specific redirect details were not returned by host.",
                        authTxnId: String(resultRecord.authTxnId),
                        correlationId,
                    };
                }
                if (!sessionId) {
                    throw new Error("Auth broker returned neither session id nor authorization url.");
                }
                const nextContext = {
                    ...context,
                    sessionId,
                    accountId: typeof (result as { accountId?: unknown })?.accountId === "string"
                        ? String((result as { accountId: string }).accountId).trim()
                        : context.accountId,
                };
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, nextContext);
                this.appendRecentActivity("auth-start", `${context.providerId} · session created`);
                return { ok: true, ...nextContext, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "AUTH_START_FAILED");
                return {
                    ok: false,
                    code: mapped.code,
                    error: this.augmentSharePointAuthStartError(context, mapped.message),
                    correlationId,
                };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.AUTH_REFRESH_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("auth-refresh");
            try {
                this.requireConnectorNetwork("refresh host auth session");
                const context = this.normalizeContext(data);
                if (!context.sessionId) {
                    return { ok: false, code: "SESSION_REQUIRED", error: "Session id is required for refresh.", correlationId };
                }
                const broker = this.resolveAuthBroker();
                const authRefreshInput: Record<string, unknown> = {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                };
                const sharePointDeviceCodeRequest = this.buildSharePointDeviceCodeRefreshRequest(context);
                if (sharePointDeviceCodeRequest) {
                    authRefreshInput.request = sharePointDeviceCodeRequest;
                }
                const result = await this.callBroker(broker, "refresh", authRefreshInput);
                if (result && typeof result === "object" && (result as { ok?: unknown }).ok === false) {
                    const resultRecord = result as Record<string, unknown>;
                    const errorMessage = typeof resultRecord.error === "string" ? resultRecord.error.trim() : "Auth refresh failed.";
                    if (
                        context.providerId.trim().toLowerCase() === "sharepoint"
                        && sharePointDeviceCodeRequest
                        && /status 400|authorization_pending|slow_down|authorization_declined|bad_verification_code/i.test(errorMessage)
                    ) {
                        return {
                            ok: true,
                            pending: true,
                            sessionId: context.sessionId,
                            verificationUri: context.authVerificationUri,
                            verificationUriComplete: context.authVerificationUriComplete,
                            userCode: context.authUserCode,
                            message: "Microsoft authorization is still pending. Finish sign-in in the browser, then click Auth Refresh again.",
                            correlationId,
                        };
                    }
                    return {
                        ok: false,
                        code: typeof resultRecord.code === "string" ? resultRecord.code : "AUTH_REFRESH_FAILED",
                        error: errorMessage,
                        correlationId,
                    };
                }
                const nextSessionId = typeof (result as { sessionId?: unknown })?.sessionId === "string"
                    ? String((result as { sessionId: string }).sessionId).trim()
                    : context.sessionId;
                const explicitSessionCredentials = this.readExplicitSessionCredentials(result);
                if (explicitSessionCredentials) {
                    const persistResult = await this.callBroker(broker, "refresh", {
                        providerId: context.providerId,
                        sessionId: nextSessionId,
                        auth: explicitSessionCredentials.auth,
                        credentials: explicitSessionCredentials.credentials,
                    });
                    if (persistResult && typeof persistResult === "object" && (persistResult as { ok?: unknown }).ok === false) {
                        const persistRecord = persistResult as Record<string, unknown>;
                        return {
                            ok: false,
                            code: typeof persistRecord.code === "string" ? persistRecord.code : "AUTH_REFRESH_FAILED",
                            error: typeof persistRecord.error === "string" ? persistRecord.error : "Failed to persist plugin-parsed session credentials.",
                            correlationId,
                        };
                    }
                }
                const nextContext = {
                    ...context,
                    sessionId: nextSessionId,
                    authDeviceCode: "",
                    authVerificationUri: "",
                    authVerificationUriComplete: "",
                    authUserCode: "",
                    authCodeExpiresAt: "",
                };
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, nextContext);
                this.appendRecentActivity("auth-refresh", context.providerId);
                return { ok: true, ...nextContext, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "AUTH_REFRESH_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.AUTH_LOGOUT_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("auth-logout");
            try {
                this.requireConnectorNetwork("close host auth session");
                const context = this.normalizeContext(data);
                if (!context.sessionId) {
                    return { ok: false, code: "SESSION_REQUIRED", error: "Session id is required for logout.", correlationId };
                }
                const broker = this.resolveAuthBroker();
                await this.callBroker(broker, "logout", {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                });
                const cleared: ServiceContext = { ...context, sessionId: "" };
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.CONTEXT, cleared);
                this.appendRecentActivity("auth-logout", context.providerId);
                return { ok: true, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "AUTH_LOGOUT_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.LIST_WORKSPACES_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("list-workspaces");
            try {
                this.requireConnectorNetwork("list connector workspaces");
                const context = this.normalizeContext(data);
                if (!context.sessionId) {
                    return { ok: false, code: "SESSION_REQUIRED", error: "Session id is required.", correlationId };
                }
                const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const query = typeof (data as { query?: unknown })?.query === "string"
                    ? String((data as { query: string }).query).trim()
                    : "";
                const cursor = this.normalizeCursor(data);
                const broker = this.resolveContentBroker();
                const result = await this.callContentOperation(broker, "list-workspaces", {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                    endpointUrl: context.endpointUrl || undefined,
                    query: query || undefined,
                    limit: 100,
                    cursor: cursor || undefined,
                });
                const items = this.normalizeItems(result);
                const nextCursor = this.readResponseCursor(result);
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.LAST_CURSOR, nextCursor);
                this.appendRecentActivity("list-workspaces", `${context.providerId} · ${items.length}`);
                return { ok: true, items, nextCursor, page: { nextCursor }, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "LIST_WORKSPACES_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.LIST_ITEMS_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("list-items");
            try {
                this.requireConnectorNetwork("list connector items");
                const context = this.normalizeContext(data);
                if (!context.sessionId || !context.workspaceId) {
                    return {
                        ok: false,
                        code: "CONTEXT_REQUIRED",
                        error: "Session id and workspace id are required.",
                        correlationId,
                    };
                }
                const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const cursor = this.normalizeCursor(data);
                const broker = this.resolveContentBroker();
                const result = await this.callContentOperation(broker, "list-items", {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                    endpointUrl: context.endpointUrl || undefined,
                    workspaceId: context.workspaceId,
                    path: context.path || "/",
                    limit: 300,
                    cursor: cursor || undefined,
                });
                const items = this.normalizeItems(result);
                const nextCursor = this.readResponseCursor(result);
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.LAST_CURSOR, nextCursor);
                this.appendRecentActivity("list-items", `${context.workspaceId} · ${items.length}`);
                return { ok: true, items, nextCursor, page: { nextCursor }, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "LIST_ITEMS_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.SEARCH_ITEMS_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("search");
            try {
                this.requireConnectorNetwork("search connector items");
                const context = this.normalizeContext(data);
                const query = typeof (data as { query?: unknown })?.query === "string"
                    ? String((data as { query: string }).query).trim()
                    : "";
                if (!context.sessionId || !query) {
                    return { ok: false, code: "SEARCH_INPUT_INVALID", error: "Session id and query are required.", correlationId };
                }
                const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const cursor = this.normalizeCursor(data);
                const broker = this.resolveContentBroker();
                const result = await this.callContentOperation(broker, "search-items", {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                    endpointUrl: context.endpointUrl || undefined,
                    workspaceId: context.workspaceId || undefined,
                    query,
                    limit: 300,
                    cursor: cursor || undefined,
                });
                const items = this.normalizeItems(result);
                const nextCursor = this.readResponseCursor(result);
                this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.LAST_CURSOR, nextCursor);
                this.appendRecentActivity("search", `${query} · ${items.length}`);
                return { ok: true, items, nextCursor, page: { nextCursor }, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "SEARCH_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.CREATE_SHARE_LINK_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("share-link");
            try {
                this.requireConnectorNetwork("create connector share link");
                const context = this.normalizeContext(data);
                const itemId = typeof (data as { itemId?: unknown })?.itemId === "string"
                    ? String((data as { itemId: string }).itemId).trim()
                    : "";
                if (!context.sessionId || !itemId) {
                    return {
                        ok: false,
                        code: "SHARE_LINK_INPUT_INVALID",
                        error: "Session id and item id are required.",
                        correlationId,
                    };
                }
                const endpointValidation = this.validateEndpointUrl(context.endpointUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const broker = this.resolveContentBroker();
                const result = await this.callContentOperation(broker, "create-share-link", {
                    providerId: context.providerId,
                    sessionId: context.sessionId,
                    endpointUrl: context.endpointUrl || undefined,
                    itemId,
                    scope: "organization",
                    type: "view",
                });
                const webUrl = typeof (result as { webUrl?: unknown })?.webUrl === "string"
                    ? String((result as { webUrl: string }).webUrl).trim()
                    : "";
                if (!webUrl) {
                    throw new Error("Content broker returned empty share link.");
                }
                this.appendRecentActivity("create-share-link", itemId);
                return { ok: true, webUrl, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "CREATE_SHARE_LINK_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.OPEN_BROWSER_HANDLER, async (data: unknown) => {
            const correlationId = this.getCorrelationId("open-browser");
            try {
                const webUrl = typeof (data as { webUrl?: unknown })?.webUrl === "string"
                    ? String((data as { webUrl: string }).webUrl).trim()
                    : "";
                if (!webUrl) {
                    return { ok: false, code: "OPEN_URL_INVALID", error: "Web URL is required.", correlationId };
                }
                const endpointValidation = this.validateEndpointUrl(webUrl);
                if (!endpointValidation.ok) {
                    return { ok: false, code: endpointValidation.code, error: endpointValidation.error, correlationId };
                }
                const broker = this.resolveOpenUrlBroker();
                if (!broker || typeof broker.open !== "function") {
                    return {
                        ok: false,
                        code: "BROWSER_BROKER_UNAVAILABLE",
                        error: "Host browser broker is not available.",
                        correlationId,
                    };
                }
                await this.callBroker(broker, "open", {
                    url: webUrl,
                    policy: "trusted-content-link",
                });
                this.appendRecentActivity("open-browser", webUrl);
                return { ok: true, correlationId };
            } catch (error) {
                const mapped = this.classifyBrokerError(error, "OPEN_BROWSER_FAILED");
                return { ok: false, code: mapped.code, error: mapped.message, correlationId };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.BUILD_CLIPBOARD_WRITE_REQUEST_HANDLER, (data: unknown) => {
            requireCapability("system.clipboard.write", "copy share link to clipboard");
            const text = typeof (data as { text?: unknown })?.text === "string"
                ? String((data as { text: string }).text).trim()
                : "";
            if (!text) {
                return { ok: false, code: "CLIPBOARD_INPUT_INVALID", error: "Text is required." };
            }
            return createClipboardWriteRequest(text, "copy service share link");
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.ADD_FAVORITE_HANDLER, (data: unknown) => {
            const item = this.normalizeItems([(data as { item?: unknown })?.item])[0];
            if (!item) {
                return { ok: false, code: "FAVORITE_INPUT_INVALID", error: "Favorite item payload is invalid." };
            }
            const current = this.readState<ContentItem[]>(ServiceContentHubPlugin.STORAGE_KEYS.FAVORITES, []);
            const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 100);
            this.writeState(ServiceContentHubPlugin.STORAGE_KEYS.FAVORITES, next);
            this.appendRecentActivity("add-favorite", item.name);
            return { ok: true, favorites: next };
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.QUICK_OPEN_FAVORITES_HANDLER, () => ({
            ok: true,
            intent: "open-favorites",
        }));
        PluginRegistry.registerHandler(ServiceContentHubPlugin.QUICK_SEARCH_HANDLER, () => ({
            ok: true,
            intent: "focus-search",
        }));
        PluginRegistry.registerHandler(ServiceContentHubPlugin.SIDE_PANEL_BROWSER_HANDLER, () => ({
            ok: true,
            intent: "open-browser",
        }));
        PluginRegistry.registerHandler(ServiceContentHubPlugin.SIDE_PANEL_RECENT_HANDLER, () => ({
            ok: true,
            intent: "open-recent",
        }));
        PluginRegistry.registerHandler(ServiceContentHubPlugin.SIDE_PANEL_SETTINGS_HANDLER, () => ({
            ok: true,
            intent: "open-settings",
        }));

        PluginRegistry.registerHandler(ServiceContentHubPlugin.AI_ASSISTANTS_LIST_HANDLER, async (data: unknown) => {
            const payload = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
            try {
                const provider = (globalThis as { __FDO_AI_LIST_ASSISTANTS?: ((input: unknown) => unknown) }).__FDO_AI_LIST_ASSISTANTS;
                if (typeof provider !== "function") {
                    return { ok: true, source: "fallback", assistants: [] };
                }
                const result = provider({
                    purpose: typeof payload.purpose === "string" ? payload.purpose : "automation",
                });
                const resolved = result && typeof (result as Promise<unknown>).then === "function"
                    ? await (result as Promise<unknown>)
                    : result;
                const assistants = Array.isArray((resolved as { assistants?: unknown[] })?.assistants)
                    ? (resolved as { assistants: unknown[] }).assistants
                    : (Array.isArray(resolved) ? resolved : []);
                return { ok: true, source: "fdo-ai", assistants };
            } catch (error) {
                return { ok: false, code: "AI_ASSISTANTS_LIST_FAILED", error: error instanceof Error ? error.message : String(error) };
            }
        });

        PluginRegistry.registerHandler(ServiceContentHubPlugin.AI_ASSIST_HANDLER, async (data: unknown) => {
            const payload = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
            try {
                const provider = (globalThis as { __FDO_AI_REQUEST?: ((input: unknown) => unknown) }).__FDO_AI_REQUEST;
                if (typeof provider === "function") {
                    const result = provider(payload);
                    const resolved = result && typeof (result as Promise<unknown>).then === "function"
                        ? await (result as Promise<unknown>)
                        : result;
                    const message = typeof (resolved as { message?: unknown })?.message === "string"
                        ? String((resolved as { message: string }).message).trim()
                        : (
                            typeof (resolved as { text?: unknown })?.text === "string"
                                ? String((resolved as { text: string }).text).trim()
                                : ""
                        );
                    if (message) {
                        return { ok: true, source: "fdo-ai", message };
                    }
                }
                const count = Number((payload.summary as { count?: unknown })?.count || 0);
                return {
                    ok: true,
                    source: "fallback",
                    message: `Local fallback summary: ${count} result(s). Configure __FDO_AI_REQUEST for richer output.`,
                };
            } catch (error) {
                return { ok: false, code: "AI_ASSIST_FAILED", error: error instanceof Error ? error.message : String(error) };
            }
        });
    }
}

new ServiceContentHubPlugin();

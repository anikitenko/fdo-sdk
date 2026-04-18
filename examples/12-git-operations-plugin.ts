import {
    createAICapabilityPreset,
    createNetworkCapabilityBundle,
    createOperatorToolActionRequest,
    createOperatorToolCapabilityPreset,
    defineRenderOnLoad,
    createStorageCapabilityPreset,
    createPrivilegedActionBackendRequest,
    DOM,
    DOMButton,
    DOMInput,
    DOMNested,
    DOMSemantic,
    DOMText,
    FDOInterface,
    FDO_SDK,
    PluginCapability,
    PluginMetadata,
    PluginRegistry,
    QuickAction,
    runCapabilityPreflight,
    requireCapability,
    requireNetworkScopeCapability,
    SidePanelConfig,
    StoreType,
} from "@anikitenko/fdo-sdk";

type GitOperationId =
    | "status"
    | "branches"
    | "log"
    | "diffStat"
    | "showHead"
    | "fetch"
    | "pullFFOnly"
    | "commitStaged";

type GitOperationDefinition = {
    title: string;
    args: string[];
    reason: string;
    timeoutMs: number;
};

type GitStatusSummary = {
    branch: string;
    aheadBehind: string;
    staged: number;
    modified: number;
    untracked: number;
    conflicts: number;
    isClean: boolean;
    stagedFiles: string[];
};

const GIT_OPERATIONS: Record<GitOperationId, GitOperationDefinition> = {
    status: {
        title: "Repository Status",
        args: ["status", "--porcelain=v2", "--branch"],
        reason: "collect repository status summary for troubleshooting dashboard",
        timeoutMs: 10000,
    },
    branches: {
        title: "Branch Overview",
        args: ["branch", "-vv"],
        reason: "inspect local branches and upstream tracking state",
        timeoutMs: 10000,
    },
    log: {
        title: "Recent Commits",
        args: ["log", "--oneline", "--decorate", "-n", "15"],
        reason: "inspect recent commit history for context",
        timeoutMs: 10000,
    },
    diffStat: {
        title: "Working Tree Diff Summary",
        args: ["diff", "--stat", "--compact-summary"],
        reason: "inspect changed files footprint before mutation commands",
        timeoutMs: 10000,
    },
    showHead: {
        title: "HEAD Metadata",
        args: ["show", "--stat", "--no-patch", "HEAD"],
        reason: "inspect latest commit metadata for quick diagnostics",
        timeoutMs: 10000,
    },
    fetch: {
        title: "Fetch All Remotes",
        args: ["fetch", "--all", "--prune"],
        reason: "synchronize remote refs before branch and pull workflows",
        timeoutMs: 15000,
    },
    pullFFOnly: {
        title: "Pull (Fast-Forward Only)",
        args: ["pull", "--ff-only"],
        reason: "safely update current branch without merge commits",
        timeoutMs: 20000,
    },
    commitStaged: {
        title: "Commit Staged Changes",
        args: ["commit", "-m", "<message>"],
        reason: "persist staged repository changes with explicit commit message",
        timeoutMs: 20000,
    },
};

export default class GitOperationsPlugin extends FDO_SDK implements FDOInterface {
    private static readonly BUILD_ID = "git-ops-2026-04-16-r3";
    private static readonly PREPARE_HANDLER = "gitOps.v1.prepare";
    private static readonly BUILD_REQUEST_HANDLER = "gitOps.v1.buildRequest";
    private static readonly SAVE_REPO_PATH_HANDLER = "gitOps.v1.saveRepoPath";
    private static readonly PREFETCH_ORIGINAL_REPO_REQUEST_HANDLER = "gitOps.v1.prefetchOriginalRepoRequest";
    private static readonly PREFETCH_ORIGINAL_REPO_HANDLER = "gitOps.v1.prefetchOriginalRepo";
    private static readonly BUILD_COMMIT_REQUEST_HANDLER = "gitOps.v1.buildCommitRequest";
    private static readonly AI_ASSIST_HANDLER = "fdo.ai.request.v1";
    private static readonly AI_ASSISTANTS_LIST_HANDLER = "fdo.ai.assistants.list.v1";
    private static readonly QUICK_STATUS_HANDLER = "gitOps.v1.quick.status";
    private static readonly QUICK_SNAPSHOT_HANDLER = "gitOps.v1.quick.snapshot";
    private static readonly QUICK_PREFETCH_HANDLER = "gitOps.v1.quick.prefetch";
    private static readonly SIDE_PANEL_CONSOLE_HANDLER = "gitOps.v1.sidePanel.console";
    private static readonly SIDE_PANEL_RECENT_HANDLER = "gitOps.v1.sidePanel.recent";
    private static readonly SIDE_PANEL_PROFILES_HANDLER = "gitOps.v1.sidePanel.profiles";
    private static readonly ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY = "fdo.public.git.originalConfiguredRepository";
    private static readonly NETWORK_SCOPE_ID = "public-web-secure";

    private static readonly STORAGE_KEYS = {
        REPO_PATH: "gitOps:repoPath",
        ORIGINAL_CONFIGURED_REPO_PATH: "gitOps:originalConfiguredRepoPath",
        ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY: "gitOps:originalConfiguredRepoPublicKey",
        LAST_ACTION: "gitOps:lastAction",
    } as const;

    private readonly _metadata: PluginMetadata = {
        name: "Git Operations Plugin",
        version: "1.0.0",
        author: "FDO SDK",
        description: "One-file Git operations dashboard using scoped operator execution, DOM helpers, and injected iframe libraries.",
        icon: "git-repo",
    };

    private readonly dom = new DOM();
    private readonly classNames = this.buildClassNames();
    private readonly gitCommand = this.resolveGitCommand();
    private readonly declaredCapabilities: PluginCapability[] = this.buildDeclaredCapabilities();
    private sessionStore?: StoreType;
    private persistentStore?: StoreType;
    private handlersRegistered = false;
    private jsonStoreAvailable = false;
    private persistentStoreDiagnostic = "";
    private repoPathForRender = this.getDefaultRepoPath();

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
                name: "Git Status",
                subtitle: "Run repository status in current path",
                icon: "dashboard",
                message_type: GitOperationsPlugin.QUICK_STATUS_HANDLER,
            },
            {
                name: "Git Snapshot",
                subtitle: "Run status, branches, log, diff, show",
                icon: "history",
                message_type: GitOperationsPlugin.QUICK_SNAPSHOT_HANDLER,
            },
            {
                name: "Prefetch Original Repo",
                subtitle: "Resolve remote origin and metadata",
                icon: "cloud-download",
                message_type: GitOperationsPlugin.QUICK_PREFETCH_HANDLER,
            },
        ];
    }

    defineSidePanel(): SidePanelConfig {
        return {
            icon: "git-repo",
            label: "Git Ops",
            submenu_list: [
                {
                    id: "git-console",
                    name: "Console",
                    message_type: GitOperationsPlugin.SIDE_PANEL_CONSOLE_HANDLER,
                },
                {
                    id: "git-recent",
                    name: "Recent Runs",
                    message_type: GitOperationsPlugin.SIDE_PANEL_RECENT_HANDLER,
                },
                {
                    id: "git-profiles",
                    name: "Repo Profiles",
                    message_type: GitOperationsPlugin.SIDE_PANEL_PROFILES_HANDLER,
                },
            ],
        };
    }

    private buildDeclaredCapabilities(): PluginCapability[] {
        return [
            ...createOperatorToolCapabilityPreset("git"),
            ...createAICapabilityPreset("host.ai"),
            ...createNetworkCapabilityBundle({
                transports: ["https"],
                scopeId: GitOperationsPlugin.NETWORK_SCOPE_ID,
            }),
            // Mirrors host capability model: storage base + storage.json backend leaf.
            ...createStorageCapabilityPreset("storageJSON"),
        ];
    }

    private getGrantedCapabilities(): PluginCapability[] {
        try {
            const diagnostics = PluginRegistry.getDiagnostics({ notificationsLimit: 0 });
            const granted = diagnostics?.capabilities?.permissions?.granted;
            if (Array.isArray(granted)) {
                return granted as PluginCapability[];
            }
        } catch {
            // Ignore diagnostics lookup errors and treat as no granted capabilities.
        }

        return [];
    }

    private cls(name: string): string {
        return this.classNames[name] ?? "";
    }

    private getFallbackStore(): StoreType {
        if (!this.sessionStore) {
            // Default store must stay non-gated and safe for startup/render paths.
            this.sessionStore = PluginRegistry.useStore("default");
        }
        return this.sessionStore;
    }

    private ensurePersistentStore(): void {
        if (this.persistentStore) {
            return;
        }

        try {
            this.persistentStore = PluginRegistry.useStore("json");
            this.jsonStoreAvailable = true;
            this.persistentStoreDiagnostic = "";
        } catch (error) {
            this.jsonStoreAvailable = false;
            const reason = error instanceof Error ? error.message : String(error);
            this.persistentStoreDiagnostic = this.sanitizeStorageErrorReason(reason) || "JSON store is not available.";
            this.warn(
                "Git operations plugin: JSON store unavailable. Grant capabilities 'storage' and 'storage.json' and configure storage root via PluginRegistry.configureStorage({ rootDir }) or FDO_SDK_STORAGE_ROOT. Using session fallback for repository path.",
                { error }
            );
        }
    }

    private runDeclaredCapabilityPreflight(action: string): void {
        const report = runCapabilityPreflight({
            action,
            declared: this.declaredCapabilities,
            granted: this.getGrantedCapabilities(),
        });

        if (report.ok) {
            return;
        }

        this.warn(`Git operations plugin capability preflight warning: ${report.summary}`, {
            action: report.action,
            missingCapabilities: report.missing.map((entry) => entry.capability),
            remediations: report.remediations,
        });
    }

    private getStorageDiagnostic(): string {
        return this.persistentStoreDiagnostic
            || "JSON persistent store is currently unavailable in this runtime session.";
    }

    private sanitizeStorageErrorReason(reason: string): string {
        const trimmed = String(reason || "").trim();
        if (!trimmed) {
            return "";
        }
        if (
            trimmed.includes('Capability "storage" is required')
            || trimmed.includes('Capability "storage.json" is required')
        ) {
            return "JSON persistent store is unavailable in the current capability session.";
        }
        return trimmed;
    }

    private getRuntimeProcess(): {
        platform?: string;
        cwd?: () => string;
        env?: Record<string, string | undefined>;
    } | null {
        const candidate = (globalThis as { process?: unknown }).process;
        if (!candidate || typeof candidate !== "object") {
            return null;
        }
        return candidate as {
            platform?: string;
            cwd?: () => string;
            env?: Record<string, string | undefined>;
        };
    }

    private getRuntimeRequire(): ((moduleName: string) => unknown) | null {
        const candidate = (globalThis as { require?: unknown }).require;
        if (typeof candidate === "function") {
            return candidate as (moduleName: string) => unknown;
        }

        // Some host/bundled runtimes do not expose require on globalThis.
        // Probe common Node-compatible fallbacks so path validation remains reliable.
        try {
            const dynamicRequire = Function("return (typeof require === 'function') ? require : null;")() as unknown;
            if (typeof dynamicRequire === "function") {
                return dynamicRequire as (moduleName: string) => unknown;
            }
        } catch {
            // Ignore and continue probing.
        }

        try {
            const moduleRef = Function("return (typeof module !== 'undefined') ? module : null;")() as
                | { require?: unknown }
                | null;
            if (moduleRef && typeof moduleRef.require === "function") {
                return moduleRef.require as (moduleName: string) => unknown;
            }
        } catch {
            // Ignore and continue probing.
        }

        return null;
    }

    private getRuntimePlatform(): string {
        const runtimeProcess = this.getRuntimeProcess();
        const platform = runtimeProcess?.platform;
        return typeof platform === "string" && platform.trim()
            ? platform.trim()
            : "unknown";
    }

    private isAbsolutePath(value: string): boolean {
        if (!value) {
            return false;
        }
        return /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(value);
    }

    private normalizeInputPath(rawValue: string): string {
        const trimmed = rawValue.trim();
        const withoutQuotes =
            (trimmed.startsWith("\"") && trimmed.endsWith("\""))
            || (trimmed.startsWith("'") && trimmed.endsWith("'"))
                ? trimmed.slice(1, -1).trim()
                : trimmed;

        if (withoutQuotes.startsWith("file://")) {
            try {
                const url = new URL(withoutQuotes);
                const decoded = decodeURIComponent(url.pathname || "");
                if (this.getRuntimePlatform() === "win32") {
                    const normalized = decoded.replace(/^\/([a-zA-Z]:)/, "$1").replace(/\//g, "\\");
                    return normalized;
                }
                return decoded || withoutQuotes;
            } catch {
                return withoutQuotes;
            }
        }

        if (withoutQuotes === "~" || withoutQuotes.startsWith("~/") || withoutQuotes.startsWith("~\\")) {
            const runtimeProcess = this.getRuntimeProcess();
            const home = runtimeProcess?.env
                ? (this.getRuntimePlatform() === "win32"
                    ? runtimeProcess.env["USERPROFILE"] ?? runtimeProcess.env["HOME"] ?? ""
                    : runtimeProcess.env["HOME"] ?? "")
                : "";
            if (home && this.isAbsolutePath(home)) {
                const suffix = withoutQuotes.slice(1);
                if (!suffix) {
                    return home;
                }
                if (home.endsWith("/") || home.endsWith("\\")) {
                    return `${home}${suffix.replace(/^[/\\]/, "")}`;
                }
                return `${home}${suffix}`;
            }
        }

        return withoutQuotes;
    }

    private fileExists(pathValue: string): boolean {
        const runtimeRequire = this.getRuntimeRequire();
        if (!runtimeRequire) {
            return false;
        }
        try {
            const fsModule = runtimeRequire("fs") as { existsSync?: (target: string) => boolean };
            if (!fsModule || typeof fsModule.existsSync !== "function") {
                return false;
            }
            return fsModule.existsSync(pathValue);
        } catch {
            return false;
        }
    }

    private isExecutableFile(pathValue: string): boolean {
        const runtimeRequire = this.getRuntimeRequire();
        if (!runtimeRequire) {
            return false;
        }

        try {
            const fsModule = runtimeRequire("fs") as {
                accessSync?: (target: string, mode?: number) => void;
                constants?: { X_OK?: number };
            };
            if (!fsModule || typeof fsModule.accessSync !== "function") {
                return this.fileExists(pathValue);
            }
            const executeMode = typeof fsModule.constants?.X_OK === "number"
                ? fsModule.constants.X_OK
                : undefined;
            fsModule.accessSync(pathValue, executeMode);
            return true;
        } catch {
            return false;
        }
    }

    private isLikelyDirectoryPath(pathValue: string): boolean {
        const runtimeRequire = this.getRuntimeRequire();
        if (!runtimeRequire) {
            return true;
        }
        try {
            const fsModule = runtimeRequire("fs") as {
                statSync?: (target: string) => { isDirectory?: () => boolean };
            };
            if (!fsModule || typeof fsModule.statSync !== "function") {
                return true;
            }
            const stat = fsModule.statSync(pathValue);
            return typeof stat?.isDirectory === "function" ? stat.isDirectory() : true;
        } catch {
            return true;
        }
    }

    private getDefaultRepoPath(): string {
        const runtimeProcess = this.getRuntimeProcess();
        const homeCandidate = runtimeProcess?.env
            ? (
                this.getRuntimePlatform() === "win32"
                    ? runtimeProcess.env["USERPROFILE"] ?? runtimeProcess.env["HOME"] ?? ""
                    : runtimeProcess.env["HOME"] ?? ""
            )
            : "";
        if (typeof homeCandidate === "string" && this.isAbsolutePath(homeCandidate)) {
            return homeCandidate;
        }

        const cwdCandidate = typeof runtimeProcess?.cwd === "function" ? runtimeProcess.cwd() : "";
        if (
            typeof cwdCandidate === "string"
            && this.isAbsolutePath(cwdCandidate)
            && !cwdCandidate.includes("/plugin-data/")
            && !cwdCandidate.includes("\\plugin-data\\")
        ) {
            return cwdCandidate;
        }
        return this.getRuntimePlatform() === "win32" ? "C:\\" : "/";
    }

    private getExecutableDirectory(pathValue: string): string {
        const normalized = pathValue.replace(/[\\/]+/g, "/");
        const lastSlash = normalized.lastIndexOf("/");
        return lastSlash > 0 ? normalized.slice(0, lastSlash) : "";
    }

    private buildClassNames(): Record<string, string> {
        const tokens: Record<string, Record<string, unknown>> = {
            page: {
                fontFamily: "\"Inter\", \"Segoe UI\", sans-serif",
                color: "#12202f",
                background: "linear-gradient(180deg, #f4f8ff 0%, #eef4ff 100%)",
                border: "1px solid #d8e2f7",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
            },
            top: {
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "flex-start",
                flexWrap: "wrap",
            },
            headingWrap: {
                display: "flex",
                flexDirection: "column",
                gap: "4px",
            },
            heading: {
                margin: "0",
                fontSize: "24px",
                lineHeight: "1.2",
                letterSpacing: "-0.01em",
            },
            subtitle: {
                margin: "0",
                fontSize: "13px",
                color: "#4b607b",
            },
            badge: {
                alignSelf: "flex-start",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#dde9ff",
                color: "#2f4d82",
                fontSize: "12px",
                fontWeight: "600",
            },
            controls: {
                background: "#ffffff",
                border: "1px solid #d8e1f1",
                borderRadius: "12px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
            },
            label: {
                fontSize: "12px",
                color: "#4f6079",
                fontWeight: "600",
            },
            inputRow: {
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
            },
            input: {
                flex: "1",
                minWidth: "260px",
                border: "1px solid #c4d4f0",
                borderRadius: "8px",
                padding: "8px 10px",
                fontSize: "13px",
                color: "#15283b",
                background: "#fbfdff",
            },
            buttonRow: {
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
            },
            commitRow: {
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
            },
            button: {
                border: "1px solid #b8caeb",
                background: "#f9fbff",
                color: "#27456f",
                borderRadius: "8px",
                padding: "7px 10px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 120ms ease",
                "&:hover": {
                    background: "#edf3ff",
                },
                "&:disabled": {
                    opacity: "0.6",
                    cursor: "not-allowed",
                    background: "#f4f6fb",
                },
            },
            buttonTiny: {
                border: "1px solid #b9c8df",
                background: "#f7f9fc",
                color: "#2d4769",
                borderRadius: "7px",
                padding: "5px 8px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                "&:hover": {
                    background: "#ebf1fb",
                },
                "&:disabled": {
                    opacity: "0.65",
                    cursor: "not-allowed",
                },
            },
            aiPromptInput: {
                flex: "1",
                minWidth: "280px",
                border: "1px solid #c7d5ee",
                borderRadius: "7px",
                padding: "5px 8px",
                fontSize: "11px",
                color: "#203550",
                background: "#fbfdff",
            },
            buttonPrimary: {
                borderColor: "#2f63c6",
                background: "#2f63c6",
                color: "#ffffff",
                "&:hover": {
                    background: "#2353af",
                },
            },
            meta: {
                margin: "0",
                fontSize: "12px",
                color: "#647b9b",
            },
            panels: {
                display: "grid",
                gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
                gap: "12px",
                minHeight: "360px",
            },
            panel: {
                background: "#ffffff",
                border: "1px solid #d8e1f1",
                borderRadius: "12px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                minHeight: "0",
            },
            panelTitle: {
                margin: "0",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#4c617f",
            },
            summaryGrid: {
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "8px",
            },
            summaryItem: {
                border: "1px solid #d8e4fa",
                borderRadius: "10px",
                padding: "8px",
                background: "#f8fbff",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
            },
            summaryLabel: {
                fontSize: "11px",
                color: "#5f7698",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
            },
            summaryValue: {
                fontSize: "18px",
                fontWeight: "700",
                color: "#1e3860",
            },
            summaryHint: {
                margin: "0",
                fontSize: "12px",
                color: "#5f7493",
                lineHeight: "1.4",
            },
            historyWrap: {
                borderTop: "1px solid #e3ebfa",
                paddingTop: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
            },
            historyHeader: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
            },
            historyTitle: {
                margin: "0",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#4d6384",
            },
            historyList: {
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "180px",
                overflow: "auto",
            },
            historyItem: {
                border: "1px solid #d9e5fa",
                borderRadius: "8px",
                background: "#f8fbff",
                padding: "7px 8px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
            },
            historyPrimary: {
                margin: "0",
                fontSize: "12px",
                fontWeight: "600",
                color: "#1a365e",
            },
            historyMeta: {
                margin: "0",
                fontSize: "11px",
                color: "#587196",
            },
            historyStatusOk: {
                color: "#17683e",
            },
            historyStatusFailed: {
                color: "#8a2b2b",
            },
            outputWrap: {
                flex: "1",
                minHeight: "0",
                background: "#0f172a",
                borderRadius: "10px",
                overflow: "auto",
                border: "1px solid #1d2d4b",
            },
            output: {
                margin: "0",
                padding: "12px",
                minHeight: "320px",
                color: "#dbeafe",
                fontSize: "12px",
                lineHeight: "1.5",
                fontFamily: "\"SFMono-Regular\", \"Menlo\", \"Consolas\", monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            },
            commandBarBackdrop: {
                position: "fixed",
                inset: "0",
                background: "rgba(5, 11, 24, 0.62)",
                display: "none",
                alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: "10vh",
                zIndex: "9999",
                "&[data-open=\"true\"]": {
                    display: "flex",
                },
            },
            commandBarPanel: {
                width: "min(880px, calc(100vw - 28px))",
                maxHeight: "76vh",
                background: "#ffffff",
                border: "1px solid #cfdcf5",
                borderRadius: "14px",
                boxShadow: "0 24px 64px rgba(9, 20, 40, 0.28)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            },
            commandBarHeader: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                borderBottom: "1px solid #e1e9f9",
                background: "#f7faff",
            },
            commandBarInput: {
                flex: "1",
                border: "1px solid #c6d5f2",
                borderRadius: "10px",
                padding: "9px 12px",
                fontSize: "13px",
                color: "#13253b",
                background: "#ffffff",
            },
            commandBarHint: {
                margin: "0",
                fontSize: "11px",
                color: "#60779b",
                whiteSpace: "nowrap",
            },
            commandBarList: {
                overflow: "auto",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
            },
            commandBarItem: {
                border: "1px solid #d7e3fa",
                background: "#fbfdff",
                borderRadius: "10px",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 120ms ease",
                "&:hover": {
                    background: "#eff5ff",
                    borderColor: "#b5caf2",
                },
                "&[data-selected=\"true\"]": {
                    background: "#e8f1ff",
                    borderColor: "#7ea5ea",
                },
            },
            commandBarItemTitle: {
                margin: "0",
                fontSize: "13px",
                fontWeight: "700",
                color: "#163257",
            },
            commandBarItemMeta: {
                margin: "0",
                fontSize: "11px",
                color: "#5e769b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
            },
            commandBarEmpty: {
                margin: "10px 6px",
                fontSize: "12px",
                color: "#60779b",
            },
        };

        const classes: Record<string, string> = {};
        for (const [key, style] of Object.entries(tokens)) {
            classes[key] = this.dom.createClassFromStyle(style as Record<string, string>);
        }
        return classes;
    }

    private resolveGitCommand(): string {
        const candidates = this.getRuntimePlatform() === "win32"
            ? [
                "C:\\Program Files\\Git\\bin\\git.exe",
                "C:\\Program Files\\Git\\cmd\\git.exe",
                "C:\\Program Files (x86)\\Git\\bin\\git.exe",
                "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
            ]
            : [
                "/usr/bin/git",
                "/usr/local/bin/git",
                "/opt/homebrew/bin/git",
            ];

        const runtimeRequire = this.getRuntimeRequire();
        if (!runtimeRequire) {
            return candidates[0];
        }

        const runtimeProcess = this.getRuntimeProcess();
        const pathValue = runtimeProcess?.env?.PATH ?? "";
        const separator = this.getRuntimePlatform() === "win32" ? ";" : ":";
        const pathEntries = pathValue
            .split(separator)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => entry.replace(/[\\/]+$/, ""));

        const pathOrderedCandidates = candidates
            .map((candidate) => ({
                candidate,
                dir: this.getExecutableDirectory(candidate),
            }))
            .sort((left, right) => {
                const leftIndex = pathEntries.findIndex((entry) => entry === left.dir);
                const rightIndex = pathEntries.findIndex((entry) => entry === right.dir);
                if (leftIndex === -1 && rightIndex === -1) return 0;
                if (leftIndex === -1) return 1;
                if (rightIndex === -1) return -1;
                return leftIndex - rightIndex;
            })
            .map((entry) => entry.candidate);

        for (const candidate of pathOrderedCandidates) {
            if (this.isExecutableFile(candidate)) {
                return candidate;
            }
        }

        return candidates[0];
    }

    private resolveRepoPath(rawValue: unknown): string {
        const requestedRaw = typeof rawValue === "string" && rawValue.trim()
            ? rawValue
            : this.getDefaultRepoPath();
        const requested = this.normalizeInputPath(requestedRaw);
        const canCheckFilesystem = this.getRuntimeRequire() !== null;

        if (!this.isAbsolutePath(requested)) {
            throw new Error(`Repository path must be absolute: ${requested}`);
        }
        if (canCheckFilesystem && !this.fileExists(requested)) {
            throw new Error(`Repository path does not exist: ${requested}`);
        }
        if (!this.isLikelyDirectoryPath(requested)) {
            throw new Error(`Repository path must point to a directory: ${requested}`);
        }

        return requested;
    }

    private buildReadRemoteOriginRequest(repoPath: string) {
        return createPrivilegedActionBackendRequest(
            createOperatorToolActionRequest("git", {
                command: this.gitCommand,
                args: ["config", "--get", "remote.origin.url"],
                cwd: repoPath,
                timeoutMs: 8000,
                dryRun: false,
                reason: `read remote.origin.url through host-mediated scoped Git execution (repository path: ${repoPath})`,
            }),
            { correlationIdPrefix: "git-prefetch-origin" }
        );
    }

    private parseGitHubRepositoryFromRemote(remoteUrl: string): {
        owner: string;
        repository: string;
        remoteUrl: string;
        apiUrl: string;
        htmlUrl: string;
    } | null {
        const normalized = String(remoteUrl || "").trim();
        if (!normalized) {
            return null;
        }

        const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
        const httpsMatch = normalized.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
        const match = sshMatch ?? httpsMatch;
        if (!match) {
            return null;
        }

        const owner = match[1].trim();
        const repository = match[2].trim();
        if (!owner || !repository) {
            return null;
        }

        return {
            owner,
            repository,
            remoteUrl: `https://github.com/${owner}/${repository}`,
            apiUrl: `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
            htmlUrl: `https://github.com/${owner}/${repository}`,
        };
    }

    private normalizeRemoteToHttpsUrl(remoteUrl: string): string {
        const normalized = String(remoteUrl || "").trim();
        if (!normalized) {
            return "";
        }

        if (/^https:\/\//i.test(normalized)) {
            return normalized.replace(/\.git$/i, "");
        }

        const sshScpStyleMatch = normalized.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
        if (sshScpStyleMatch) {
            const host = sshScpStyleMatch[1].trim();
            const path = sshScpStyleMatch[2].trim().replace(/^\//, "");
            if (host && path) {
                return `https://${host}/${path}`;
            }
        }

        try {
            const parsed = new URL(normalized);
            if (parsed.protocol === "ssh:" || parsed.protocol === "git+ssh:") {
                const pathname = parsed.pathname.replace(/^\/+/, "").replace(/\.git$/i, "");
                const host = parsed.hostname;
                if (host && pathname) {
                    return `https://${host}/${pathname}`;
                }
            }
        } catch {
            return "";
        }

        return "";
    }

    private async prefetchRemoteRepositoryMetadata(remoteOriginUrlInput: string): Promise<Record<string, unknown>> {
        requireCapability("system.network", "prefetch original configured repository metadata");
        requireCapability("system.network.https", "prefetch original configured repository metadata");
        requireNetworkScopeCapability(
            GitOperationsPlugin.NETWORK_SCOPE_ID,
            "prefetch original configured repository metadata"
        );

        const remoteOriginUrl = String(remoteOriginUrlInput || "").trim();
        if (!remoteOriginUrl) {
            throw new Error(
                "Repository metadata prefetch failed: direct Git config inspection is unavailable in this runtime. Run scoped Git remote-origin request first and pass remoteOriginUrl."
            );
        }
        const runtimeFetch = (globalThis as { fetch?: (...args: unknown[]) => Promise<unknown> }).fetch;
        if (typeof runtimeFetch !== "function") {
            throw new Error("Runtime fetch API is unavailable; cannot prefetch repository metadata.");
        }

        const githubRepository = this.parseGitHubRepositoryFromRemote(remoteOriginUrl);
        if (githubRepository) {
            const rawResponse = await runtimeFetch(githubRepository.apiUrl, {
                method: "GET",
                headers: {
                    Accept: "application/vnd.github+json",
                    "User-Agent": "fdo-sdk-git-operations-plugin",
                },
            });

            const response = rawResponse as {
                ok?: boolean;
                status?: number;
                statusText?: string;
                json?: () => Promise<unknown>;
                text?: () => Promise<string>;
            };

            if (!response || response.ok !== true) {
                const body = typeof response?.text === "function"
                    ? String((await response.text()) || "").slice(0, 400)
                    : "";
                const status = typeof response?.status === "number" ? response.status : 0;
                const statusText = typeof response?.statusText === "string" ? response.statusText : "unknown";
                throw new Error(`Remote metadata request failed (${status} ${statusText}). ${body}`.trim());
            }

            if (typeof response.json !== "function") {
                throw new Error("Remote metadata response does not expose a JSON parser.");
            }

            const payload = await response.json();
            const data = typeof payload === "object" && payload !== null
                ? payload as Record<string, unknown>
                : {};

            return {
                provider: "github",
                repository: `${githubRepository.owner}/${githubRepository.repository}`,
                remoteOriginUrl,
                normalizedRemoteUrl: githubRepository.remoteUrl,
                apiUrl: githubRepository.apiUrl,
                htmlUrl: typeof data.html_url === "string" && data.html_url.trim()
                    ? data.html_url
                    : githubRepository.htmlUrl,
                defaultBranch: typeof data.default_branch === "string" ? data.default_branch : "",
                visibility:
                    typeof data.visibility === "string"
                        ? data.visibility
                        : (typeof data.private === "boolean" ? (data.private ? "private" : "public") : ""),
                description: typeof data.description === "string" ? data.description : "",
                stars: typeof data.stargazers_count === "number" ? data.stargazers_count : 0,
                forks: typeof data.forks_count === "number" ? data.forks_count : 0,
                openIssues: typeof data.open_issues_count === "number" ? data.open_issues_count : 0,
                fetchedAt: new Date().toISOString(),
            };
        }

        const normalizedRemoteUrl = this.normalizeRemoteToHttpsUrl(remoteOriginUrl);
        if (!normalizedRemoteUrl) {
            throw new Error(
                `Remote origin "${remoteOriginUrl}" cannot be normalized to HTTPS for metadata prefetch.`
            );
        }

        const rawResponse = await runtimeFetch(normalizedRemoteUrl, { method: "HEAD" });
        const response = rawResponse as {
            ok?: boolean;
            status?: number;
            statusText?: string;
        };
        const status = typeof response?.status === "number" ? response.status : 0;
        const statusText = typeof response?.statusText === "string" ? response.statusText : "unknown";
        if (!response || response.ok !== true) {
            throw new Error(`Remote repository reachability check failed (${status} ${statusText}).`);
        }

        return {
            provider: "generic",
            remoteOriginUrl,
            normalizedRemoteUrl,
            status,
            statusText,
            reachable: true,
            fetchedAt: new Date().toISOString(),
        };
    }

    private getStoredRepoPath(): string {
        const candidate = this.readState<string>(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH) ?? "";
        if (typeof candidate === "string" && this.isAbsolutePath(candidate.trim())) {
            return candidate.trim();
        }
        return this.getDefaultRepoPath();
    }

    private getStoredRepoPathSafe(): string {
        try {
            return this.getStoredRepoPath();
        } catch (error) {
            this.warn("Failed to resolve stored repository path. Falling back to default path.", { error });
            return this.getDefaultRepoPath();
        }
    }

    private ensureOriginalConfiguredRepo(pathValue: string): {
        originalConfiguredRepoPath: string;
        originalConfiguredRepoPublicKey: string;
        persistence: "persistent-json" | "session-fallback";
    } {
        const normalized = this.resolveRepoPath(pathValue);
        const existingCandidate = this.readState<string>(GitOperationsPlugin.STORAGE_KEYS.ORIGINAL_CONFIGURED_REPO_PATH) ?? "";
        const existing = typeof existingCandidate === "string" && this.isAbsolutePath(existingCandidate.trim())
            ? existingCandidate.trim()
            : "";

        const originalConfiguredRepoPath = existing || normalized;
        const pathPersistence = this.writeState(
            GitOperationsPlugin.STORAGE_KEYS.ORIGINAL_CONFIGURED_REPO_PATH,
            originalConfiguredRepoPath
        );
        const publicKeyPersistence = this.writeState(
            GitOperationsPlugin.STORAGE_KEYS.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
            GitOperationsPlugin.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY
        );

        return {
            originalConfiguredRepoPath,
            originalConfiguredRepoPublicKey: GitOperationsPlugin.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
            persistence:
                pathPersistence === "persistent-json" && publicKeyPersistence === "persistent-json"
                    ? "persistent-json"
                    : "session-fallback",
        };
    }

    private saveRepoPath(pathValue: string): {
        storedPath: string;
        persistence: "persistent-json" | "session-fallback";
        originalConfiguredRepoPath: string;
        originalConfiguredRepoPublicKey: string;
        originalConfiguredRepoPersistence: "persistent-json" | "session-fallback";
    } {
        const normalized = this.resolveRepoPath(pathValue);
        const originalConfiguredRepo = this.ensureOriginalConfiguredRepo(normalized);
        this.repoPathForRender = normalized;
        const persistence = this.writeState(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH, normalized);
        this.writeState(
            GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION,
            `${persistence === "persistent-json" ? "saved-repo-path" : "saved-repo-path-session"}:${normalized}`
        );
        return {
            storedPath: normalized,
            persistence,
            originalConfiguredRepoPath: originalConfiguredRepo.originalConfiguredRepoPath,
            originalConfiguredRepoPublicKey: originalConfiguredRepo.originalConfiguredRepoPublicKey,
            originalConfiguredRepoPersistence: originalConfiguredRepo.persistence,
        };
    }

    private readState<T = unknown>(key: string): T | undefined {
        this.ensurePersistentStore();
        if (this.persistentStore) {
            try {
                const persistentValue = this.persistentStore.get<T>(key);
                if (persistentValue !== undefined) {
                    return persistentValue;
                }
            } catch (error) {
                this.warn("Persistent JSON store read failed. Falling back to session store.", { key, error });
                this.persistentStore = undefined;
                this.jsonStoreAvailable = false;
                const reason = error instanceof Error ? error.message : String(error);
                this.persistentStoreDiagnostic = this.sanitizeStorageErrorReason(reason) || "Persistent JSON store read failed.";
            }
        }

        const fallbackStore = this.getFallbackStore();
        return fallbackStore.get<T>(key);
    }

    private writeState<T = unknown>(key: string, value: T): "persistent-json" | "session-fallback" {
        this.ensurePersistentStore();
        const fallbackStore = this.getFallbackStore();
        fallbackStore.set<T>(key, value);

        if (this.persistentStore) {
            try {
                this.persistentStore.set<T>(key, value);
                this.persistentStoreDiagnostic = "";
                return "persistent-json";
            } catch (error) {
                this.warn("Persistent JSON store write failed. Falling back to session store.", { key, error });
                this.persistentStore = undefined;
                this.jsonStoreAvailable = false;
                const reason = error instanceof Error ? error.message : String(error);
                this.persistentStoreDiagnostic = this.sanitizeStorageErrorReason(reason) || "Persistent JSON store write failed.";
            }
        }

        return "session-fallback";
    }

    private isOperationId(value: unknown): value is GitOperationId {
        return typeof value === "string" && Object.prototype.hasOwnProperty.call(GIT_OPERATIONS, value);
    }

    private buildFallbackCommitMessage(input: {
        summary?: unknown;
        repoPath?: unknown;
    }): string {
        const summary = typeof input.summary === "object" && input.summary !== null
            ? input.summary as Record<string, unknown>
            : {};
        const staged = typeof summary.staged === "number" ? summary.staged : 0;
        const modified = typeof summary.modified === "number" ? summary.modified : 0;
        const untracked = typeof summary.untracked === "number" ? summary.untracked : 0;
        const branch = typeof summary.branch === "string" && summary.branch.trim()
            ? summary.branch.trim()
            : "current-branch";
        const repoPath = typeof input.repoPath === "string" && input.repoPath.trim()
            ? input.repoPath.trim()
            : "repository";
        const repoName = repoPath.split(/[\\/]/).filter(Boolean).pop() || "repo";

        if (staged > 0 || modified > 0 || untracked > 0) {
            return `chore(${repoName}): update working tree on ${branch} (staged:${staged} modified:${modified} untracked:${untracked})`;
        }

        return `chore(${repoName}): update repository changes on ${branch}`;
    }

    private registerHandlers(): void {
        if (this.handlersRegistered) {
            return;
        }
        this.handlersRegistered = true;

        PluginRegistry.registerHandler(GitOperationsPlugin.PREPARE_HANDLER, () => {
            try {
                this.ensurePersistentStore();
                const originalConfiguredRepo = this.ensureOriginalConfiguredRepo(this.repoPathForRender);
                return {
                    ok: true,
                    gitCommand: this.gitCommand,
                    defaultRepoPath: this.repoPathForRender,
                    originalConfiguredRepoPath: originalConfiguredRepo.originalConfiguredRepoPath,
                    originalConfiguredRepoPublicKey: originalConfiguredRepo.originalConfiguredRepoPublicKey,
                    originalConfiguredRepoPersistence: originalConfiguredRepo.persistence,
                    jsonStoreAvailable: this.jsonStoreAvailable,
                    storageMode: this.jsonStoreAvailable ? "persistent-json" : "session-fallback",
                    storageDiagnostic: this.jsonStoreAvailable ? "" : this.getStorageDiagnostic(),
                    lastAction: this.readState<string>(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION) ?? "none",
                    operations: Object.entries(GIT_OPERATIONS).map(([id, definition]) => ({
                        id,
                        title: definition.title,
                        args: definition.args,
                    })),
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "PREPARE_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                    gitCommand: this.gitCommand,
                    defaultRepoPath: this.getDefaultRepoPath(),
                    originalConfiguredRepoPath: this.getDefaultRepoPath(),
                    originalConfiguredRepoPublicKey: GitOperationsPlugin.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
                    originalConfiguredRepoPersistence: this.jsonStoreAvailable ? "persistent-json" : "session-fallback",
                    storageMode: this.jsonStoreAvailable ? "persistent-json" : "session-fallback",
                    storageDiagnostic: this.jsonStoreAvailable ? "" : this.getStorageDiagnostic(),
                    lastAction: "prepare-failed",
                    operations: [],
                };
            }
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.QUICK_STATUS_HANDLER, () => {
            this.writeState(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION, "quick-action:status");
            return {
                ok: true,
                intent: "run-operation",
                operation: "status",
                message: "Quick action registered. Open plugin to run Status.",
            };
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.QUICK_SNAPSHOT_HANDLER, () => {
            this.writeState(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION, "quick-action:snapshot");
            return {
                ok: true,
                intent: "run-snapshot",
                message: "Quick action registered. Open plugin to run Snapshot.",
            };
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.QUICK_PREFETCH_HANDLER, () => {
            this.writeState(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION, "quick-action:prefetch");
            return {
                ok: true,
                intent: "prefetch-original-repo",
                message: "Quick action registered. Open plugin to prefetch original repository.",
            };
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.SIDE_PANEL_CONSOLE_HANDLER, () => ({
            ok: true,
            intent: "open-console",
            message: "Git console is ready.",
        }));

        PluginRegistry.registerHandler(GitOperationsPlugin.SIDE_PANEL_RECENT_HANDLER, () => ({
            ok: true,
            intent: "open-recent-runs",
            lastAction: this.readState<string>(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION) ?? "none",
        }));

        PluginRegistry.registerHandler(GitOperationsPlugin.SIDE_PANEL_PROFILES_HANDLER, () => ({
            ok: true,
            intent: "open-repo-profiles",
            currentRepo: this.readState<string>(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH) ?? this.repoPathForRender,
        }));

        PluginRegistry.registerHandler(GitOperationsPlugin.SAVE_REPO_PATH_HANDLER, (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { cwd?: unknown }
                    : {};
                if (typeof payload.cwd !== "string" || !payload.cwd.trim()) {
                    return {
                        ok: false,
                        code: "INVALID_REPO_PATH",
                        error: "Repository path is required.",
                    };
                }
                const result = this.saveRepoPath(payload.cwd);
                return {
                    ok: true,
                    ...result,
                    storageDiagnostic: result.persistence === "session-fallback" ? this.getStorageDiagnostic() : "",
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "SAVE_REPO_PATH_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.PREFETCH_ORIGINAL_REPO_REQUEST_HANDLER, (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { cwd?: unknown }
                    : {};
                const fallbackCandidate = typeof payload.cwd === "string" && payload.cwd.trim()
                    ? payload.cwd
                    : this.repoPathForRender;
                const result = this.ensureOriginalConfiguredRepo(fallbackCandidate);
                const requestEnvelope = this.buildReadRemoteOriginRequest(result.originalConfiguredRepoPath);
                this.writeState(
                    GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION,
                    `prefetch-origin-request:${result.persistence}`
                );
                return {
                    ok: true,
                    ...result,
                    requestEnvelope,
                    storageDiagnostic: result.persistence === "session-fallback" ? this.getStorageDiagnostic() : "",
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "PREFETCH_ORIGINAL_REPO_REQUEST_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.PREFETCH_ORIGINAL_REPO_HANDLER, async (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { cwd?: unknown; remoteOriginUrl?: unknown }
                    : {};
                const fallbackCandidate = typeof payload.cwd === "string" && payload.cwd.trim()
                    ? payload.cwd
                    : this.repoPathForRender;
                const result = this.ensureOriginalConfiguredRepo(fallbackCandidate);
                const remoteOriginUrl = typeof payload.remoteOriginUrl === "string"
                    ? payload.remoteOriginUrl.trim()
                    : "";
                if (!remoteOriginUrl) {
                    return {
                        ok: true,
                        ...result,
                        remoteOriginUrl: "",
                        remoteRepository: null,
                        warning: "Remote origin URL is unavailable. Prefetch completed without metadata.",
                        storageDiagnostic: result.persistence === "session-fallback" ? this.getStorageDiagnostic() : "",
                    };
                }
                let remoteRepository: Record<string, unknown> | null = null;
                let warning = "";
                try {
                    remoteRepository = await this.prefetchRemoteRepositoryMetadata(remoteOriginUrl);
                } catch (metadataError) {
                    warning = metadataError instanceof Error ? metadataError.message : String(metadataError);
                }
                this.repoPathForRender = result.originalConfiguredRepoPath;
                this.writeState(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH, result.originalConfiguredRepoPath);
                this.writeState(
                    GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION,
                    `prefetched-original-configured-repo:${result.persistence}`
                );
                return {
                    ok: true,
                    ...result,
                    remoteOriginUrl,
                    remoteRepository,
                    warning: warning || undefined,
                    storageDiagnostic: result.persistence === "session-fallback" ? this.getStorageDiagnostic() : "",
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "PREFETCH_ORIGINAL_REPO_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.BUILD_REQUEST_HANDLER, (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { operation?: unknown; cwd?: unknown; dryRun?: unknown }
                    : {};

                if (!this.isOperationId(payload.operation)) {
                    return {
                        ok: false,
                        code: "INVALID_OPERATION",
                        error: "Unsupported Git operation requested.",
                    };
                }

                const operation = payload.operation;
                const definition = GIT_OPERATIONS[operation];
                const cwd = this.resolveRepoPath(payload.cwd);
                const dryRun = payload.dryRun === true;
                const persisted = this.saveRepoPath(cwd);
                const request = createOperatorToolActionRequest("git", {
                    command: this.gitCommand,
                    args: definition.args,
                    cwd,
                    timeoutMs: definition.timeoutMs,
                    dryRun,
                    reason: `${definition.reason} (repository path: ${cwd})`,
                });
                this.writeState(
                    GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION,
                    `built-request:${operation}:${dryRun ? "dry-run:" : ""}${persisted.persistence}`
                );

                return createPrivilegedActionBackendRequest(request, {
                    correlationIdPrefix: `git-${operation}`,
                });
            } catch (error) {
                return {
                    ok: false,
                    code: "BUILD_REQUEST_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        PluginRegistry.registerHandler(GitOperationsPlugin.BUILD_COMMIT_REQUEST_HANDLER, (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { cwd?: unknown; message?: unknown; dryRun?: unknown }
                    : {};
                const cwd = this.resolveRepoPath(payload.cwd);
                const message = typeof payload.message === "string" ? payload.message.trim() : "";
                if (!message) {
                    return {
                        ok: false,
                        code: "COMMIT_MESSAGE_REQUIRED",
                        error: "Commit message is required.",
                    };
                }
                const dryRun = payload.dryRun === true;
                const persisted = this.saveRepoPath(cwd);
                const args = dryRun
                    ? ["commit", "--dry-run", "-m", message]
                    : ["commit", "-m", message];
                const request = createOperatorToolActionRequest("git", {
                    command: this.gitCommand,
                    args,
                    cwd,
                    timeoutMs: GIT_OPERATIONS.commitStaged.timeoutMs,
                    dryRun,
                    reason: `${GIT_OPERATIONS.commitStaged.reason} (repository path: ${cwd})`,
                });
                this.writeState(
                    GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION,
                    `built-request:commitStaged:${dryRun ? "dry-run:" : ""}${persisted.persistence}`
                );

                return createPrivilegedActionBackendRequest(request, {
                    correlationIdPrefix: "git-commit",
                });
            } catch (error) {
                return {
                    ok: false,
                    code: "BUILD_COMMIT_REQUEST_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });

        const resolveAiAssistantsListRequest = (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as { purpose?: unknown; provider?: unknown; model?: unknown }
                    : {};
                const purposeFilter = typeof payload.purpose === "string" ? payload.purpose.trim().toLowerCase() : "";
                const providerFilter = typeof payload.provider === "string" ? payload.provider.trim().toLowerCase() : "";
                const modelFilter = typeof payload.model === "string" ? payload.model.trim().toLowerCase() : "";
                const listProvider = (globalThis as {
                    __FDO_AI_LIST_ASSISTANTS?: ((input: {
                        purpose?: string;
                        provider?: string;
                        model?: string;
                    }) => unknown);
                    __FDO_AI_ASSISTANTS?: unknown[] | { assistants?: unknown[] };
                }).__FDO_AI_LIST_ASSISTANTS;
                const staticAssistants = (globalThis as {
                    __FDO_AI_ASSISTANTS?: unknown[] | { assistants?: unknown[] };
                }).__FDO_AI_ASSISTANTS;

                const normalize = (value: unknown) => {
                    const raw = Array.isArray(value)
                        ? value
                        : (
                            typeof value === "object"
                            && value !== null
                            && Array.isArray((value as { assistants?: unknown[] }).assistants)
                                ? (value as { assistants?: unknown[] }).assistants || []
                                : []
                        );
                    const seen = new Set<string>();
                    const normalized = raw
                        .map((item, index) => {
                            if (typeof item !== "object" || item === null) {
                                return null;
                            }
                            const record = item as Record<string, unknown>;
                            const id = typeof record.id === "string" ? record.id.trim() : "";
                            if (!id || seen.has(id)) {
                                return null;
                            }
                            seen.add(id);
                            const name = typeof record.name === "string" && record.name.trim()
                                ? record.name.trim()
                                : `assistant-${index + 1}`;
                            const purpose = typeof record.purpose === "string" ? record.purpose.trim() : "";
                            const provider = typeof record.provider === "string" ? record.provider.trim() : "";
                            const model = typeof record.model === "string" ? record.model.trim() : "";
                            const isDefault = record.default === true || record.isDefault === true;
                            return {
                                id,
                                name,
                                purpose,
                                provider,
                                model,
                                default: isDefault,
                            };
                        })
                        .filter((item): item is {
                            id: string;
                            name: string;
                            purpose: string;
                            provider: string;
                            model: string;
                            default: boolean;
                        } => Boolean(item))
                        .filter((item) => {
                            if (purposeFilter && item.purpose.toLowerCase() !== purposeFilter) {
                                return false;
                            }
                            if (providerFilter && item.provider.toLowerCase() !== providerFilter) {
                                return false;
                            }
                            if (modelFilter && item.model.toLowerCase() !== modelFilter) {
                                return false;
                            }
                            return true;
                        })
                        .sort((a, b) => {
                            if (a.default !== b.default) {
                                return a.default ? -1 : 1;
                            }
                            return a.name.localeCompare(b.name);
                        })
                        .slice(0, 100);
                    return normalized;
                };

                const toResult = (value: unknown) => {
                    const normalized = normalize(value);
                    return {
                        ok: true,
                        source: typeof listProvider === "function" ? "fdo-ai-provider" : "fdo-ai-static",
                        assistants: normalized,
                    };
                };

                if (typeof listProvider === "function") {
                    const result = listProvider({
                        purpose: purposeFilter || undefined,
                        provider: providerFilter || undefined,
                        model: modelFilter || undefined,
                    }) as unknown;

                    if (result && typeof (result as Promise<unknown>).then === "function") {
                        return (result as Promise<unknown>).then((resolved) => toResult(resolved));
                    }

                    return toResult(result);
                }

                if (Array.isArray(staticAssistants)) {
                    return toResult(staticAssistants);
                }
                if (typeof staticAssistants === "object" && staticAssistants !== null) {
                    return toResult(staticAssistants);
                }

                return {
                    ok: true,
                    source: "fallback",
                    assistants: [],
                    warning: "FDO AI assistants provider is not configured.",
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "AI_ASSISTANTS_LIST_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        };

        PluginRegistry.registerHandler(GitOperationsPlugin.AI_ASSISTANTS_LIST_HANDLER, (data: unknown) => {
            return resolveAiAssistantsListRequest(data);
        });

        const resolveAiAssistRequest = (data: unknown) => {
            try {
                const payload = typeof data === "object" && data !== null
                    ? data as {
                        task?: unknown;
                        summary?: unknown;
                        repoPath?: unknown;
                        prompt?: unknown;
                        commandOutput?: unknown;
                        recentRuns?: unknown;
                        assistantId?: unknown;
                        assistantPurpose?: unknown;
                        assistantProvider?: unknown;
                        assistantModel?: unknown;
                    }
                    : {};
                const task = typeof payload.task === "string" && payload.task.trim()
                    ? payload.task.trim()
                    : "commit-message";

                const provider = (globalThis as {
                    __FDO_AI_REQUEST?: ((input: {
                        task: string;
                        summary?: unknown;
                        repoPath?: string;
                        prompt?: string;
                        commandOutput?: string;
                        recentRuns?: unknown;
                        assistantId?: string;
                        assistantPurpose?: string;
                        assistantProvider?: string;
                        assistantModel?: string;
                    }) => unknown);
                    __FDO_AI_ASSISTANT?: ((input: {
                        task: string;
                        summary?: unknown;
                        repoPath?: string;
                        prompt?: string;
                        commandOutput?: string;
                        recentRuns?: unknown;
                        assistantId?: string;
                        assistantPurpose?: string;
                        assistantProvider?: string;
                        assistantModel?: string;
                    }) => unknown);
                }).__FDO_AI_REQUEST;
                const legacyProvider = (globalThis as {
                    __FDO_AI_ASSISTANT?: ((input: {
                        task: string;
                        summary?: unknown;
                        repoPath?: string;
                        prompt?: string;
                        commandOutput?: string;
                        recentRuns?: unknown;
                        assistantId?: string;
                        assistantPurpose?: string;
                        assistantProvider?: string;
                        assistantModel?: string;
                    }) => unknown);
                }).__FDO_AI_ASSISTANT;
                const aiProvider = typeof provider === "function" ? provider : legacyProvider;

                if (typeof aiProvider === "function") {
                    const providerResult = aiProvider({
                        task,
                        summary: payload.summary,
                        repoPath: typeof payload.repoPath === "string" ? payload.repoPath : undefined,
                        prompt: typeof payload.prompt === "string" ? payload.prompt : undefined,
                        commandOutput: typeof payload.commandOutput === "string" ? payload.commandOutput : undefined,
                        recentRuns: payload.recentRuns,
                        assistantId: typeof payload.assistantId === "string" ? payload.assistantId : undefined,
                        assistantPurpose: typeof payload.assistantPurpose === "string" ? payload.assistantPurpose : undefined,
                        assistantProvider: typeof payload.assistantProvider === "string" ? payload.assistantProvider : undefined,
                        assistantModel: typeof payload.assistantModel === "string" ? payload.assistantModel : undefined,
                    }) as unknown;

                    if (providerResult && typeof (providerResult as Promise<unknown>).then === "function") {
                        return (providerResult as Promise<unknown>).then((resolved) => {
                            const candidate = typeof resolved === "object" && resolved !== null
                                ? resolved as { message?: unknown; commitMessage?: unknown; text?: unknown }
                                : {};
                            const message = typeof candidate.commitMessage === "string"
                                ? candidate.commitMessage.trim()
                                : (
                                    typeof candidate.message === "string"
                                        ? candidate.message.trim()
                                        : (typeof candidate.text === "string" ? candidate.text.trim() : "")
                                );
                            if (!message) {
                                return {
                                    ok: false,
                                    code: "AI_ASSIST_EMPTY",
                                    error: `FDO AI provider returned an empty response for task "${task}".`,
                                };
                            }
                            return {
                                ok: true,
                                source: "fdo-ai",
                                task,
                                message,
                                commitMessage: task === "commit-message" ? message : undefined,
                            };
                        });
                    }

                    const syncCandidate = typeof providerResult === "object" && providerResult !== null
                        ? providerResult as { message?: unknown; commitMessage?: unknown; text?: unknown }
                        : {};
                    const syncMessage = typeof syncCandidate.commitMessage === "string"
                        ? syncCandidate.commitMessage.trim()
                        : (
                            typeof syncCandidate.message === "string"
                                ? syncCandidate.message.trim()
                                : (typeof syncCandidate.text === "string" ? syncCandidate.text.trim() : "")
                        );
                    if (syncMessage) {
                        return {
                            ok: true,
                            source: "fdo-ai",
                            task,
                            message: syncMessage,
                            commitMessage: task === "commit-message" ? syncMessage : undefined,
                        };
                    }
                }

                if (task === "summarize-output") {
                    const output = typeof payload.commandOutput === "string" ? payload.commandOutput : "";
                    const firstLines = output
                        .split(/\r?\n/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(" | ");
                    return {
                        ok: true,
                        source: "fallback",
                        task,
                        message: firstLines
                            ? `Local summary: ${firstLines}`
                            : "Local summary: no command output available yet.",
                        warning: "FDO AI provider is not configured. Using local fallback summary.",
                    };
                }

                if (task === "suggest-next-command") {
                    const summary = typeof payload.summary === "object" && payload.summary !== null
                        ? payload.summary as { conflicts?: unknown; modified?: unknown; untracked?: unknown; branch?: unknown }
                        : {};
                    const conflicts = typeof summary.conflicts === "number" ? summary.conflicts : 0;
                    const modified = typeof summary.modified === "number" ? summary.modified : 0;
                    const untracked = typeof summary.untracked === "number" ? summary.untracked : 0;
                    const branch = typeof summary.branch === "string" ? summary.branch : "current branch";
                    let suggestion = "Run status to refresh repository diagnostics.";
                    if (conflicts > 0) {
                        suggestion = "Resolve conflicts first, then run status and commit staged changes.";
                    } else if (modified > 0 || untracked > 0) {
                        suggestion = "Run diff stat, stage intended files, then commit staged changes.";
                    } else {
                        suggestion = `Working tree looks clean on ${branch}. Consider fetch --all --prune then pull --ff-only.`;
                    }
                    return {
                        ok: true,
                        source: "fallback",
                        task,
                        message: suggestion,
                        warning: "FDO AI provider is not configured. Using local fallback suggestion.",
                    };
                }

                return {
                    ok: true,
                    source: "fallback",
                    task,
                    message: this.buildFallbackCommitMessage({
                        summary: payload.summary,
                        repoPath: payload.repoPath,
                    }),
                    commitMessage: this.buildFallbackCommitMessage({
                        summary: payload.summary,
                        repoPath: payload.repoPath,
                    }),
                    warning: "FDO AI provider is not configured. Using local fallback response.",
                };
            } catch (error) {
                return {
                    ok: false,
                    code: "AI_ASSIST_FAILED",
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        };

        PluginRegistry.registerHandler(GitOperationsPlugin.AI_ASSIST_HANDLER, (data: unknown) => {
            return resolveAiAssistRequest(data);
        });
    }

    init(): void {
        this.registerHandlers();
        this.runDeclaredCapabilityPreflight("initialize git operations plugin runtime");

        try {
            const fallbackStore = this.getFallbackStore();
            this.ensurePersistentStore();

            const bootRepoPath = this.getStoredRepoPathSafe();
            const originalConfiguredRepo = this.ensureOriginalConfiguredRepo(bootRepoPath);
            this.repoPathForRender = bootRepoPath;
            this.writeState(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH, bootRepoPath);
            this.writeState(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION, "initialized");
            // Keep a volatile mirror for diagnostics fallback when JSON is unavailable mid-session.
            fallbackStore.set(GitOperationsPlugin.STORAGE_KEYS.REPO_PATH, bootRepoPath);
            fallbackStore.set(
                GitOperationsPlugin.STORAGE_KEYS.ORIGINAL_CONFIGURED_REPO_PATH,
                originalConfiguredRepo.originalConfiguredRepoPath
            );
            fallbackStore.set(
                GitOperationsPlugin.STORAGE_KEYS.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
                originalConfiguredRepo.originalConfiguredRepoPublicKey
            );
            fallbackStore.set(GitOperationsPlugin.STORAGE_KEYS.LAST_ACTION, "initialized");

            this.info("Git operations plugin initialized", {
                gitCommand: this.gitCommand,
                repoPath: bootRepoPath,
                jsonStoreAvailable: this.jsonStoreAvailable,
                requestedCapabilities: this.declaredCapabilities,
            });
        } catch (error) {
            this.warn("Git operations plugin initialized in degraded mode. Handlers remain available.", { error });
        }
    }

    render(): string {
        const defaultRepoPath = this.repoPathForRender || this.getDefaultRepoPath();
        const text = new DOMText();
        const nested = new DOMNested();
        const semantic = new DOMSemantic();
        const button = new DOMButton();
        const input = new DOMInput(
            "git-repo-path",
            {
                classes: [this.cls("input")],
                disableDefaultClass: true,
            },
            { value: defaultRepoPath }
        );
        const commitMessageInput = new DOMInput(
            "git-commit-message",
            {
                classes: [this.cls("input")],
                disableDefaultClass: true,
            },
            { placeholder: "Commit message (required for staged commit)" }
        );
        const aiPromptInput = new DOMInput(
            "git-ai-prompt",
            {
                classes: [this.cls("aiPromptInput")],
                disableDefaultClass: true,
            },
            { placeholder: "Optional AI context (e.g., ticket, incident, rollout note)" }
        );
        const aiAssistantSelectInput = new DOMInput(
            "git-ai-assistant-select",
            {
                classes: [this.cls("input")],
                disableDefaultClass: true,
            }
        );

        const createActionButton = (id: string, label: string, classes: string[] = [this.cls("button")]) => {
            return button.createStaticButton(
                label,
                {
                    classes: classes.filter(Boolean),
                    disableDefaultClass: true,
                },
                id,
                { type: "button" }
            );
        };

        const summaryGrid = nested.createBlockDiv(
            [],
            {
                classes: [this.cls("summaryGrid")],
                disableDefaultClass: true,
                customAttributes: {
                    "data-summary-item-class": this.cls("summaryItem"),
                    "data-summary-label-class": this.cls("summaryLabel"),
                    "data-summary-value-class": this.cls("summaryValue"),
                },
            },
            "git-summary-grid"
        );

        const outputCode = text.createCodeText(
            "$ waiting for command...",
            {
                classes: ["language-bash"],
                disableDefaultClass: true,
            },
            "git-output-code"
        );

        const content = nested.createBlockDiv(
            [
                nested.createBlockDiv(
                    [
                        nested.createBlockDiv(
                            [
                                text.createHText(
                                    2,
                                    "Git Operations Console",
                                    {
                                        classes: [this.cls("heading")],
                                        disableDefaultClass: true,
                                    }
                                ),
                                text.createPText(
                                    "Analyze repository status, branch state, commit history, and diff footprint through host-scoped Git execution.",
                                    {
                                        classes: [this.cls("subtitle")],
                                        disableDefaultClass: true,
                                    }
                                ),
                            ],
                            {
                                classes: [this.cls("headingWrap")],
                                disableDefaultClass: true,
                            }
                        ),
                        text.createSpanText(
                            "Injected libs: Notyf + Highlight.js",
                            {
                                classes: [this.cls("badge")],
                                disableDefaultClass: true,
                            }
                        ),
                    ],
                    {
                        classes: [this.cls("top")],
                        disableDefaultClass: true,
                    }
                ),
                nested.createBlockDiv(
                    [
                        text.createLabelText(
                            "Repository path (absolute path required)",
                            "git-repo-path",
                            {
                                classes: [this.cls("label")],
                                disableDefaultClass: true,
                            }
                        ),
                        nested.createBlockDiv(
                            [input.createInput("text")],
                            {
                                classes: [this.cls("inputRow")],
                                disableDefaultClass: true,
                            }
                        ),
                        nested.createBlockDiv(
                            [
                                createActionButton("git-save-path", "Save Path"),
                                createActionButton("git-prefetch-original", "Prefetch Original Repo"),
                                createActionButton("git-run-status", "Status", [this.cls("button"), this.cls("buttonPrimary")]),
                                createActionButton("git-run-branches", "Branches"),
                                createActionButton("git-run-log", "Recent Log"),
                                createActionButton("git-run-diff", "Diff Stat"),
                                createActionButton("git-run-show", "Show HEAD"),
                                createActionButton("git-run-fetch", "Fetch --all --prune"),
                                createActionButton("git-run-pull", "Pull --ff-only"),
                                createActionButton("git-run-commit", "Commit Staged", [this.cls("button"), this.cls("buttonPrimary")]),
                                createActionButton("git-run-snapshot", "Run Snapshot"),
                            ],
                            {
                                classes: [this.cls("buttonRow")],
                                disableDefaultClass: true,
                            }
                        ),
                        nested.createBlockDiv(
                            [
                                commitMessageInput.createInput("text"),
                                aiPromptInput.createInput("text"),
                                aiAssistantSelectInput.createSelect([
                                    aiAssistantSelectInput.createOption("AI Assistant: loading...", "", true),
                                ]),
                                createActionButton("git-ai-refresh-assistants", "Reload Assistants", [this.cls("buttonTiny")]),
                                createActionButton("git-ai-commit-message", "AI: Commit Message", [this.cls("buttonTiny")]),
                                createActionButton("git-ai-summarize-output", "AI: Summarize Output", [this.cls("buttonTiny")]),
                                createActionButton("git-ai-suggest-next", "AI: Suggest Next Step", [this.cls("buttonTiny")]),
                            ],
                            {
                                classes: [this.cls("commitRow")],
                                disableDefaultClass: true,
                            }
                        ),
                        text.createPText(
                            "Staged files: run Status to preview files included in AI commit message generation.",
                            {
                                classes: [this.cls("meta")],
                                disableDefaultClass: true,
                            },
                            "git-staged-files"
                        ),
                        text.createPText(
                            "Runtime not prepared yet.",
                            {
                                classes: [this.cls("meta")],
                                disableDefaultClass: true,
                            },
                            "git-command-meta"
                        ),
                    ],
                    {
                        classes: [this.cls("controls")],
                        disableDefaultClass: true,
                    }
                ),
                nested.createBlockDiv(
                    [
                        semantic.createSection(
                            [
                                text.createHText(
                                    3,
                                    "Repository Summary",
                                    {
                                        classes: [this.cls("panelTitle")],
                                        disableDefaultClass: true,
                                    }
                                ),
                                summaryGrid,
                                text.createPText(
                                    "Run Status to populate summary diagnostics.",
                                    {
                                        classes: [this.cls("summaryHint")],
                                        disableDefaultClass: true,
                                    },
                                    "git-summary-hint"
                                ),
                                nested.createBlockDiv(
                                    [
                                        nested.createBlockDiv(
                                            [
                                                text.createPText(
                                                    "Recent Runs",
                                                    {
                                                        classes: [this.cls("historyTitle")],
                                                        disableDefaultClass: true,
                                                    }
                                                ),
                                            ],
                                            {
                                                classes: [this.cls("historyHeader")],
                                                disableDefaultClass: true,
                                            }
                                        ),
                                        nested.createBlockDiv(
                                            [],
                                            {
                                                classes: [this.cls("historyList")],
                                                disableDefaultClass: true,
                                                customAttributes: {
                                                    "data-item-class": this.cls("historyItem"),
                                                    "data-primary-class": this.cls("historyPrimary"),
                                                    "data-meta-class": this.cls("historyMeta"),
                                                    "data-status-ok-class": this.cls("historyStatusOk"),
                                                    "data-status-failed-class": this.cls("historyStatusFailed"),
                                                },
                                            },
                                            "git-history-list"
                                        ),
                                    ],
                                    {
                                        classes: [this.cls("historyWrap")],
                                        disableDefaultClass: true,
                                    }
                                ),
                            ],
                            {
                                classes: [this.cls("panel")],
                                disableDefaultClass: true,
                            }
                        ),
                        semantic.createSection(
                            [
                                text.createHText(
                                    3,
                                    "Command Output",
                                    {
                                        classes: [this.cls("panelTitle")],
                                        disableDefaultClass: true,
                                    }
                                ),
                                nested.createBlockDiv(
                                    [
                                        nested.createBlockDiv(
                                            [outputCode],
                                            {
                                                classes: [this.cls("output")],
                                                disableDefaultClass: true,
                                            }
                                        ),
                                    ],
                                    {
                                        classes: [this.cls("outputWrap")],
                                        disableDefaultClass: true,
                                    }
                                ),
                            ],
                            {
                                classes: [this.cls("panel")],
                                disableDefaultClass: true,
                            }
                        ),
                    ],
                    {
                        classes: [this.cls("panels")],
                        disableDefaultClass: true,
                    }
                ),
            ],
            {
                classes: [this.cls("page")],
                disableDefaultClass: true,
                customAttributes: {
                    "data-prepare-handler": GitOperationsPlugin.PREPARE_HANDLER,
                    "data-save-repo-path-handler": GitOperationsPlugin.SAVE_REPO_PATH_HANDLER,
                    "data-prefetch-request-handler": GitOperationsPlugin.PREFETCH_ORIGINAL_REPO_REQUEST_HANDLER,
                    "data-prefetch-handler": GitOperationsPlugin.PREFETCH_ORIGINAL_REPO_HANDLER,
                    "data-build-request-handler": GitOperationsPlugin.BUILD_REQUEST_HANDLER,
                    "data-build-commit-request-handler": GitOperationsPlugin.BUILD_COMMIT_REQUEST_HANDLER,
                    "data-build-id": GitOperationsPlugin.BUILD_ID,
                    "data-ai-assist-handler": GitOperationsPlugin.AI_ASSIST_HANDLER,
                    "data-ai-assistants-list-handler": GitOperationsPlugin.AI_ASSISTANTS_LIST_HANDLER,
                    "data-ai-assistant-purpose": "automation",
                    "data-ai-assistant-id": "",
                    "data-ai-assistant-provider": "",
                    "data-ai-assistant-model": "",
                    "data-original-public-key": GitOperationsPlugin.ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
                },
            },
            "git-ops-root"
        );

        return this.dom.renderHTML(content);
    }

    renderOnLoad() {
        function gitOperationsRenderOnLoad(): void {
            const root = document.getElementById("git-ops-root");
            const repoInput = document.getElementById("git-repo-path") as HTMLInputElement | null;
            const outputCode = document.getElementById("git-output-code") as HTMLElement | null;
            const summaryGrid = document.getElementById("git-summary-grid") as HTMLElement | null;
            const summaryHint = document.getElementById("git-summary-hint") as HTMLElement | null;
            const commandMeta = document.getElementById("git-command-meta") as HTMLElement | null;
            const savePathButton = document.getElementById("git-save-path") as HTMLButtonElement | null;
            const prefetchOriginalButton = document.getElementById("git-prefetch-original") as HTMLButtonElement | null;
            const statusButton = document.getElementById("git-run-status") as HTMLButtonElement | null;
            const branchesButton = document.getElementById("git-run-branches") as HTMLButtonElement | null;
            const logButton = document.getElementById("git-run-log") as HTMLButtonElement | null;
            const diffButton = document.getElementById("git-run-diff") as HTMLButtonElement | null;
            const showButton = document.getElementById("git-run-show") as HTMLButtonElement | null;
            const fetchButton = document.getElementById("git-run-fetch") as HTMLButtonElement | null;
            const pullButton = document.getElementById("git-run-pull") as HTMLButtonElement | null;
            const commitButton = document.getElementById("git-run-commit") as HTMLButtonElement | null;
            const aiRefreshAssistantsButton = document.getElementById("git-ai-refresh-assistants") as HTMLButtonElement | null;
            const aiCommitMessageButton = document.getElementById("git-ai-commit-message") as HTMLButtonElement | null;
            const aiSummarizeOutputButton = document.getElementById("git-ai-summarize-output") as HTMLButtonElement | null;
            const aiSuggestNextButton = document.getElementById("git-ai-suggest-next") as HTMLButtonElement | null;
            const commitMessageInput = document.getElementById("git-commit-message") as HTMLInputElement | null;
            const aiPromptInput = document.getElementById("git-ai-prompt") as HTMLInputElement | null;
            const aiAssistantSelect = document.getElementById("git-ai-assistant-select") as HTMLSelectElement | null;
            const snapshotButton = document.getElementById("git-run-snapshot") as HTMLButtonElement | null;
            const historyList = document.getElementById("git-history-list") as HTMLElement | null;
            const stagedFilesHint = document.getElementById("git-staged-files") as HTMLElement | null;

            if (
                !root ||
                !repoInput ||
                !outputCode ||
                !summaryGrid ||
                !summaryHint ||
                !commandMeta ||
                !savePathButton ||
                !prefetchOriginalButton ||
                !statusButton ||
                !branchesButton ||
                !logButton ||
                !diffButton ||
                !showButton ||
                !fetchButton ||
                !pullButton ||
                !commitButton ||
                !aiRefreshAssistantsButton ||
                !aiCommitMessageButton ||
                !aiSummarizeOutputButton ||
                !aiSuggestNextButton ||
                !commitMessageInput ||
                !aiPromptInput ||
                !aiAssistantSelect ||
                !snapshotButton ||
                !historyList ||
                !stagedFilesHint
            ) {
                return;
            }

            const readConfig = (attr: string, fallback: string): string => {
                const value = root.getAttribute(attr);
                return typeof value === "string" && value.trim() ? value.trim() : fallback;
            };

            const PREPARE_HANDLER = readConfig("data-prepare-handler", "gitOps.v1.prepare");
            const SAVE_REPO_PATH_HANDLER = readConfig("data-save-repo-path-handler", "gitOps.v1.saveRepoPath");
            const PREFETCH_REQUEST_HANDLER = readConfig(
                "data-prefetch-request-handler",
                "gitOps.v1.prefetchOriginalRepoRequest"
            );
            const PREFETCH_HANDLER = readConfig("data-prefetch-handler", "gitOps.v1.prefetchOriginalRepo");
            const BUILD_REQUEST_HANDLER = readConfig("data-build-request-handler", "gitOps.v1.buildRequest");
            const BUILD_COMMIT_REQUEST_HANDLER = readConfig("data-build-commit-request-handler", "gitOps.v1.buildCommitRequest");
            const BUILD_ID = readConfig("data-build-id", "unknown");
            const AI_ASSIST_HANDLER = readConfig("data-ai-assist-handler", "fdo.ai.request.v1");
            const AI_ASSISTANTS_LIST_HANDLER = readConfig("data-ai-assistants-list-handler", "fdo.ai.assistants.list.v1");
            const AI_ASSISTANT_ID = readConfig("data-ai-assistant-id", "");
            const AI_ASSISTANT_PURPOSE = readConfig("data-ai-assistant-purpose", "automation");
            const AI_ASSISTANT_PROVIDER = readConfig("data-ai-assistant-provider", "");
            const AI_ASSISTANT_MODEL = readConfig("data-ai-assistant-model", "");
            const ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY = readConfig(
                "data-original-public-key",
                "fdo.public.git.originalConfiguredRepository"
            );

            const classes = {
                summaryItem: summaryGrid.getAttribute("data-summary-item-class") || "",
                summaryLabel: summaryGrid.getAttribute("data-summary-label-class") || "",
                summaryValue: summaryGrid.getAttribute("data-summary-value-class") || "",
            };

            const operationCatalog: Record<string, { title: string; args: string[] }> = {
                status: { title: "Status", args: ["status", "--porcelain=v2", "--branch"] },
                branches: { title: "Branches", args: ["branch", "-vv"] },
                log: { title: "Recent Log", args: ["log", "--oneline", "--decorate", "-n", "15"] },
                diffStat: { title: "Diff Stat", args: ["diff", "--stat", "--compact-summary"] },
                showHead: { title: "Show HEAD", args: ["show", "--stat", "--no-patch", "HEAD"] },
                fetch: { title: "Fetch --all --prune", args: ["fetch", "--all", "--prune"] },
                pullFFOnly: { title: "Pull --ff-only", args: ["pull", "--ff-only"] },
                commitStaged: { title: "Commit Staged", args: ["commit", "-m", "<message>"] },
            };

            const buttons = [
                savePathButton,
                prefetchOriginalButton,
                statusButton,
                branchesButton,
                logButton,
                diffButton,
                showButton,
                fetchButton,
                pullButton,
                commitButton,
                aiRefreshAssistantsButton,
                aiCommitMessageButton,
                aiSummarizeOutputButton,
                aiSuggestNextButton,
                snapshotButton,
            ];

            const historyClasses = {
                item: historyList.getAttribute("data-item-class") || "",
                primary: historyList.getAttribute("data-primary-class") || "",
                meta: historyList.getAttribute("data-meta-class") || "",
                ok: historyList.getAttribute("data-status-ok-class") || "",
                failed: historyList.getAttribute("data-status-failed-class") || "",
            };

            type ExecutionHistoryEntry = {
                id: string;
                at: string;
                commandId: string;
                label: string;
                category: string;
                status: "ok" | "failed";
                dryRun: boolean;
                durationMs: number;
                correlationId: string;
                repoPath: string;
                errorCode: string;
                errorMessage: string;
            };

            type AiAssistantOption = {
                id: string;
                name: string;
                purpose: string;
                provider: string;
                model: string;
                isDefault: boolean;
            };

            const state: {
                gitCommand: string;
                lastStatus: null | GitStatusSummary;
                storageMode: string;
                storageDiagnostic: string;
                originalConfiguredRepoPath: string;
                originalConfiguredRepoPublicKey: string;
                lastRemoteRepository: Record<string, unknown> | null;
                executionHistory: ExecutionHistoryEntry[];
                runtimePrepared: boolean;
                aiAssistants: AiAssistantOption[];
                aiAssistantsLoaded: boolean;
                aiAssistantsLastLoadedAt: number;
                aiAssistantsFetchSeq: number;
                selectedAssistantId: string;
            } = {
                gitCommand: "git",
                lastStatus: null,
                storageMode: "unknown",
                storageDiagnostic: "",
                originalConfiguredRepoPath: "",
                originalConfiguredRepoPublicKey: ORIGINAL_CONFIGURED_REPO_PUBLIC_KEY,
                lastRemoteRepository: null,
                executionHistory: [],
                runtimePrepared: false,
                aiAssistants: [],
                aiAssistantsLoaded: false,
                aiAssistantsLastLoadedAt: 0,
                aiAssistantsFetchSeq: 0,
                selectedAssistantId: AI_ASSISTANT_ID,
            };

            const notifier = typeof window.Notyf === "function"
                ? new window.Notyf({ duration: 2600, position: { x: "right", y: "top" } })
                : null;

            const notifySuccess = (message: string) => {
                if (notifier && typeof notifier.success === "function") {
                    notifier.success(message);
                }
            };

            const notifyError = (message: string) => {
                if (notifier && typeof notifier.error === "function") {
                    notifier.error(message);
                }
            };

            const escapeHtml = (value: unknown): string =>
                String(value ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");

            const normalizeAssistantOption = (candidate: unknown, index: number): AiAssistantOption | null => {
                if (typeof candidate !== "object" || candidate === null) {
                    return null;
                }
                const record = candidate as Record<string, unknown>;
                const id = typeof record.id === "string" ? record.id.trim() : "";
                if (!id) {
                    return null;
                }
                const name = typeof record.name === "string" && record.name.trim()
                    ? record.name.trim()
                    : `assistant-${index + 1}`;
                const purpose = typeof record.purpose === "string" ? record.purpose.trim() : "";
                const provider = typeof record.provider === "string" ? record.provider.trim() : "";
                const model = typeof record.model === "string" ? record.model.trim() : "";
                const isDefault = record.default === true || record.isDefault === true;
                return {
                    id,
                    name,
                    purpose,
                    provider,
                    model,
                    isDefault,
                };
            };

            const assistantLabel = (assistant: AiAssistantOption): string => {
                const parts = [assistant.name];
                const providerModel = [assistant.provider, assistant.model].filter(Boolean).join(" / ");
                if (providerModel) {
                    parts.push(providerModel);
                }
                if (assistant.purpose) {
                    parts.push(`[${assistant.purpose}]`);
                }
                return parts.join(" · ");
            };

            const setAssistantLoadingState = (loading: boolean) => {
                aiAssistantSelect.disabled = loading;
                if (loading) {
                    aiAssistantSelect.innerHTML = `<option value="">AI Assistant: loading...</option>`;
                    aiAssistantSelect.value = "";
                }
            };

            const renderAssistantOptions = () => {
                const options = state.aiAssistants;
                let nextSelected = options.find((item) => item.id === state.selectedAssistantId)?.id || "";
                if (!nextSelected) {
                    const byPurpose = options.find((item) => item.purpose === AI_ASSISTANT_PURPOSE);
                    const byDefault = options.find((item) => item.isDefault);
                    nextSelected = (byPurpose || byDefault || options[0] || { id: "" }).id || "";
                }
                state.selectedAssistantId = nextSelected;

                if (options.length === 0) {
                    aiAssistantSelect.innerHTML = `<option value="">AI Assistant: default routing (${escapeHtml(AI_ASSISTANT_PURPOSE || "automation")})</option>`;
                    aiAssistantSelect.value = "";
                    return;
                }

                const rows = [
                    `<option value="">AI Assistant: default routing (${escapeHtml(AI_ASSISTANT_PURPOSE || "automation")})</option>`,
                    ...options.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(assistantLabel(item))}</option>`),
                ];
                aiAssistantSelect.innerHTML = rows.join("");
                aiAssistantSelect.value = state.selectedAssistantId;
                aiAssistantSelect.disabled = false;
            };

            const resolveSelectedAssistant = (): AiAssistantOption | null => {
                const selected = state.aiAssistants.find((item) => item.id === state.selectedAssistantId) || null;
                if (selected) {
                    return selected;
                }
                const byPurpose = state.aiAssistants.find((item) => item.purpose === AI_ASSISTANT_PURPOSE) || null;
                const byDefault = state.aiAssistants.find((item) => item.isDefault) || null;
                const fallback = byPurpose || byDefault || state.aiAssistants[0] || null;
                state.selectedAssistantId = fallback?.id || "";
                return fallback;
            };

            const fetchAssistants = async (silent = false, force = false): Promise<void> => {
                const now = Date.now();
                if (!force && state.aiAssistantsLoaded && now - state.aiAssistantsLastLoadedAt < 120000) {
                    return;
                }

                const currentSeq = state.aiAssistantsFetchSeq + 1;
                state.aiAssistantsFetchSeq = currentSeq;
                if (!silent) {
                    setAssistantLoadingState(true);
                }
                try {
                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: AI_ASSISTANTS_LIST_HANDLER,
                        content: {
                            purpose: AI_ASSISTANT_PURPOSE || undefined,
                            provider: AI_ASSISTANT_PROVIDER || undefined,
                            model: AI_ASSISTANT_MODEL || undefined,
                        },
                    });

                    if (response && (response.ok === false || response.success === false)) {
                        const code = typeof response.code === "string" ? ` (${response.code})` : "";
                        const message = typeof response.error === "string"
                            ? response.error
                            : "Failed to fetch AI assistants.";
                        throw new Error(`${message}${code}`);
                    }

                    const rawAssistants: unknown[] = Array.isArray(response)
                        ? response
                        : (
                            Array.isArray(response?.assistants)
                                ? response.assistants
                                : (Array.isArray(response?.items) ? response.items : [])
                        );
                    if (currentSeq !== state.aiAssistantsFetchSeq) {
                        return;
                    }

                    const uniqueById = new Set<string>();
                    state.aiAssistants = rawAssistants
                        .map((item: unknown, index: number) => normalizeAssistantOption(item, index))
                        .filter((item: AiAssistantOption | null): item is AiAssistantOption => Boolean(item))
                        .filter((item) => {
                            if (uniqueById.has(item.id)) {
                                return false;
                            }
                            uniqueById.add(item.id);
                            return true;
                        })
                        .sort((a, b) => {
                            if (a.isDefault !== b.isDefault) {
                                return a.isDefault ? -1 : 1;
                            }
                            return a.name.localeCompare(b.name);
                        })
                        .slice(0, 100);
                    state.aiAssistantsLoaded = true;
                    state.aiAssistantsLastLoadedAt = now;
                    renderAssistantOptions();

                    if (!silent) {
                        const note = state.aiAssistants.length > 0
                            ? `Loaded ${state.aiAssistants.length} AI assistant${state.aiAssistants.length > 1 ? "s" : ""}.`
                            : "No AI assistants returned. Requests will use host default routing.";
                        setMeta(note);
                        notifySuccess("AI assistants refreshed");
                    }
                } catch (error) {
                    if (!silent) {
                        renderAssistantOptions();
                    } else {
                        aiAssistantSelect.disabled = false;
                    }
                    throw error;
                } finally {
                    if (!silent && currentSeq === state.aiAssistantsFetchSeq) {
                        aiAssistantSelect.disabled = false;
                    }
                }
            };

            const formatIsoToLocal = (isoValue: string): string => {
                const date = new Date(isoValue);
                if (Number.isNaN(date.getTime())) {
                    return isoValue;
                }
                return date.toLocaleString();
            };

            const parseErrorCodeFromMessage = (message: string): string => {
                const match = message.match(/\(([A-Z0-9_]+)\)/);
                return match ? match[1] : "";
            };

            const renderExecutionHistory = () => {
                if (state.executionHistory.length === 0) {
                    historyList.innerHTML = `
                        <div class="${historyClasses.item}">
                            <p class="${historyClasses.primary}">No command runs yet.</p>
                            <p class="${historyClasses.meta}">Run a command or snapshot to populate timeline.</p>
                        </div>
                    `;
                    return;
                }

                historyList.innerHTML = state.executionHistory
                    .slice(0, 12)
                    .map((entry) => {
                        const statusClass = entry.status === "ok" ? historyClasses.ok : historyClasses.failed;
                        const dryRunLabel = entry.dryRun ? "dry-run" : "apply";
                        const correlationLabel = entry.correlationId || "unknown";
                        const errorSuffix = entry.status === "failed" && entry.errorMessage
                            ? ` | ${entry.errorMessage}`
                            : "";
                        return `
                            <div class="${historyClasses.item}">
                                <p class="${historyClasses.primary}">
                                    ${escapeHtml(entry.label)} ·
                                    <span class="${statusClass}">${escapeHtml(entry.status.toUpperCase())}</span>
                                </p>
                                <p class="${historyClasses.meta}">
                                    ${escapeHtml(formatIsoToLocal(entry.at))} | ${escapeHtml(entry.category)} | ${escapeHtml(dryRunLabel)} | ${escapeHtml(String(entry.durationMs))}ms
                                </p>
                                <p class="${historyClasses.meta}">
                                    repo: ${escapeHtml(entry.repoPath)} | correlation: ${escapeHtml(correlationLabel)}${escapeHtml(errorSuffix)}
                                </p>
                            </div>
                        `;
                    })
                    .join("");
            };

            const pushExecutionHistory = (entry: Omit<ExecutionHistoryEntry, "id" | "at">) => {
                state.executionHistory.unshift({
                    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    at: new Date().toISOString(),
                    ...entry,
                });
                if (state.executionHistory.length > 30) {
                    state.executionHistory = state.executionHistory.slice(0, 30);
                }
                renderExecutionHistory();
            };

            const formatPrivilegedActionError = (
                response: any,
                options?: { context?: string; fallbackCorrelationId?: string }
            ): string => {
                const context = options?.context?.trim() || "Privileged action failed";
                const fallbackCorrelationId = options?.fallbackCorrelationId?.trim() || "";
                const correlationId = typeof response?.correlationId === "string" && response.correlationId.trim()
                    ? response.correlationId.trim()
                    : (fallbackCorrelationId || "unknown");
                const errorMessage = typeof response?.error === "string" && response.error.trim()
                    ? response.error.trim()
                    : "Unknown host error";
                const code = typeof response?.code === "string" && response.code.trim()
                    ? ` (${response.code.trim()})`
                    : "";
                const stderr = typeof response?.result?.stderr === "string" ? response.result.stderr.trim() : "";
                const stdout = typeof response?.result?.stdout === "string" ? response.result.stdout.trim() : "";
                const detail = stderr || stdout;
                const detailLabel = stderr ? "stderr" : "stdout";
                const detailSuffix = detail ? `\n${detailLabel}: ${detail}` : "";
                return `${context}${code}: ${errorMessage}${detailSuffix}\nCorrelation ID: ${correlationId}`;
            };

            const appendGitExecutionHints = (
                baseMessage: string,
                response: any,
                options?: { cwdHint?: string }
            ): string => {
                const hints: string[] = [];
                const code = typeof response?.code === "string" ? response.code.trim() : "";
                const stderr = String(response?.result?.stderr || "");
                const stdout = String(response?.result?.stdout || "");
                const combined = `${stderr}\n${stdout}`.toLowerCase();
                const cwdHint = typeof options?.cwdHint === "string" ? options.cwdHint.trim() : "";

                if (code === "PROCESS_SPAWN_ENOENT" && cwdHint) {
                    hints.push(
                        `With process cwd execution, ENOENT can also mean the repository path does not exist or is inaccessible: ${cwdHint}`
                    );
                }

                if (combined.includes("not a git repository")) {
                    hints.push(
                        "The selected path is not a Git repository. Verify the repository path points to a directory containing a .git folder."
                    );
                }

                if (combined.includes("detected dubious ownership") || combined.includes("safe.directory")) {
                    hints.push(
                        `Git blocked access due to ownership safety checks. If this repository is trusted, run: git config --global --add safe.directory "${cwdHint || "<repo-path>"}"`
                    );
                }

                if (combined.includes("index.lock") || combined.includes("another git process seems to be running")) {
                    hints.push(
                        "A Git lock file is present. Ensure no other Git process is running, then remove stale .git/index.lock if safe."
                    );
                }

                if (combined.includes("authentication failed") || combined.includes("could not read username")
                    || combined.includes("repository not found") || combined.includes("permission denied (publickey)")) {
                    hints.push(
                        "Remote authentication failed. Refresh credentials/SSH agent and verify remote access permissions."
                    );
                }

                if (code === "PROCESS_TIMEOUT") {
                    hints.push(
                        "The command timed out. Increase timeoutMs for large repositories or run a narrower operation first."
                    );
                }

                if (combined.includes("permission denied") && !combined.includes("publickey")) {
                    hints.push(
                        "Filesystem permission error. Verify read/execute access for the selected repository path."
                    );
                }

                if (hints.length === 0) {
                    return baseMessage;
                }

                const uniqueHints = Array.from(new Set(hints));
                return `${baseMessage}\nHints:\n${uniqueHints.map((hint) => `- ${hint}`).join("\n")}`;
            };

            const resolveEnvelopeCorrelationId = (envelope: any): string => {
                if (typeof envelope?.result?.correlationId === "string" && envelope.result.correlationId.trim()) {
                    return envelope.result.correlationId.trim();
                }
                if (typeof envelope?.correlationId === "string" && envelope.correlationId.trim()) {
                    return envelope.correlationId.trim();
                }
                return "";
            };

            const extractPrivilegedRequestPayload = (envelope: any, context: string) => {
                const correlationId = resolveEnvelopeCorrelationId(envelope);
                const requestPayload =
                    envelope?.result?.request
                    ?? envelope?.request
                    ?? (typeof envelope?.action === "string" ? envelope : null);
                if (!requestPayload || typeof requestPayload !== "object") {
                    throw new Error(`${context} is missing a privileged request payload.`);
                }

                return {
                    correlationId,
                    requestPayload,
                };
            };

            const executePrivilegedRequestEnvelope = async (
                envelope: any,
                options: { context: string; cwdHint?: string }
            ) => {
                const { correlationId, requestPayload } = extractPrivilegedRequestPayload(envelope, options.context);
                const response = await window.createBackendReq("requestPrivilegedAction", requestPayload);
                if (response && response.ok) {
                    return {
                        response,
                        correlationId,
                    };
                }

                const formatted = formatPrivilegedActionError(response, {
                    context: options.context,
                    fallbackCorrelationId: correlationId,
                });
                throw new Error(appendGitExecutionHints(formatted, response, { cwdHint: options.cwdHint }));
            };

            const setBusy = (busy: boolean) => {
                buttons.forEach((button) => {
                    button.disabled = busy;
                });
            };

            const setMeta = (text: string) => {
                commandMeta.textContent = text;
            };

            const applySyntaxHighlight = () => {
                if (window.hljs && typeof window.hljs.highlightElement === "function") {
                    if (outputCode && outputCode.dataset) {
                        delete outputCode.dataset.highlighted;
                    }
                    outputCode.removeAttribute("data-highlighted");
                    outputCode.classList.remove("hljs");
                    window.hljs.highlightElement(outputCode);
                }
            };

            const setOutput = (text: string) => {
                outputCode.textContent = text;
                applySyntaxHighlight();
            };

            const renderSummary = (status: typeof state.lastStatus) => {
                if (!status) {
                    summaryGrid.innerHTML = [
                        ["Branch", "-"],
                        ["Ahead/Behind", "-"],
                        ["Staged", "0"],
                        ["Modified", "0"],
                        ["Untracked", "0"],
                        ["Conflicts", "0"],
                    ].map(([label, value]) => `
                        <div class="${classes.summaryItem}">
                            <div class="${classes.summaryLabel}">${escapeHtml(label)}</div>
                            <div class="${classes.summaryValue}">${escapeHtml(value)}</div>
                        </div>
                    `).join("");
                    summaryHint.textContent = "Run Status to populate summary diagnostics.";
                    return;
                }

                summaryGrid.innerHTML = [
                    ["Branch", status.branch || "(detached)"],
                    ["Ahead/Behind", status.aheadBehind || "n/a"],
                    ["Staged", String(status.staged)],
                    ["Modified", String(status.modified)],
                    ["Untracked", String(status.untracked)],
                    ["Conflicts", String(status.conflicts)],
                ].map(([label, value]) => `
                    <div class="${classes.summaryItem}">
                        <div class="${classes.summaryLabel}">${escapeHtml(label)}</div>
                        <div class="${classes.summaryValue}">${escapeHtml(value)}</div>
                    </div>
                `).join("");

                summaryHint.textContent = status.isClean
                    ? "Working tree is clean."
                    : "Working tree has pending changes.";
            };

            const renderStagedFilesHint = (status: typeof state.lastStatus) => {
                if (!status || !Array.isArray(status.stagedFiles) || status.stagedFiles.length === 0) {
                    stagedFilesHint.textContent = "Staged files: none detected. Stage changes before generating commit message.";
                    return;
                }
                const preview = status.stagedFiles.slice(0, 6).join(", ");
                const suffix = status.stagedFiles.length > 6 ? ` (+${status.stagedFiles.length - 6} more)` : "";
                stagedFilesHint.textContent = `Staged files (${status.stagedFiles.length}): ${preview}${suffix}`;
            };

            const extractPorcelainPath = (line: string): string => {
                const tabParts = line.split("\t").map((entry) => entry.trim()).filter(Boolean);
                if (tabParts.length > 0) {
                    return tabParts[tabParts.length - 1];
                }
                const tokens = line.trim().split(/\s+/);
                return tokens.length > 0 ? tokens[tokens.length - 1] : "";
            };

            const parseStatusOutput = (stdout: string) => {
                const stagedFiles = new Set<string>();
                const status: GitStatusSummary = {
                    branch: "",
                    aheadBehind: "",
                    staged: 0,
                    modified: 0,
                    untracked: 0,
                    conflicts: 0,
                    isClean: true,
                    stagedFiles: [],
                };

                String(stdout || "")
                    .split(/\r?\n/)
                    .forEach((line) => {
                        if (line.startsWith("# branch.head ")) {
                            status.branch = line.slice("# branch.head ".length).trim();
                            return;
                        }
                        if (line.startsWith("# branch.ab ")) {
                            status.aheadBehind = line.slice("# branch.ab ".length).trim();
                            return;
                        }
                        if (line.startsWith("? ")) {
                            status.untracked += 1;
                            status.isClean = false;
                            return;
                        }
                        if (line.startsWith("u ")) {
                            status.conflicts += 1;
                            status.isClean = false;
                            return;
                        }
                        if (line.startsWith("1 ") || line.startsWith("2 ")) {
                            const parts = line.split(" ");
                            const xy = parts[1] || "..";
                            const stagedCode = xy.charAt(0);
                            const workTreeCode = xy.charAt(1);
                            if (stagedCode && stagedCode !== "." && stagedCode !== "?" && stagedCode !== " ") {
                                status.staged += 1;
                                status.isClean = false;
                                const path = extractPorcelainPath(line);
                                if (path) {
                                    stagedFiles.add(path);
                                }
                            }
                            if (workTreeCode && workTreeCode !== "." && workTreeCode !== " ") {
                                status.modified += 1;
                                status.isClean = false;
                            }
                        }
                    });

                status.stagedFiles = Array.from(stagedFiles).sort((left, right) => left.localeCompare(right));
                return status;
            };

            const persistRepoPath = async (silent = false): Promise<string> => {
                const repoPath = String(repoInput.value || "").trim();
                if (!repoPath) {
                    throw new Error("Repository path is required.");
                }

                const saveResult = await window.createBackendReq("UI_MESSAGE", {
                    handler: SAVE_REPO_PATH_HANDLER,
                    content: { cwd: repoPath },
                });
                if (saveResult && (saveResult.ok === false || saveResult.success === false)) {
                    const code = typeof saveResult.code === "string" ? ` (${saveResult.code})` : "";
                    const message = typeof saveResult.error === "string"
                        ? saveResult.error
                        : "Failed to persist repository path.";
                    throw new Error(`${message}${code}`);
                }

                const storedPath = typeof saveResult?.storedPath === "string" ? saveResult.storedPath : repoPath;
                const persistence = typeof saveResult?.persistence === "string" ? saveResult.persistence : state.storageMode;
                const storageDiagnostic = typeof saveResult?.storageDiagnostic === "string"
                    ? saveResult.storageDiagnostic.trim()
                    : "";
                const originalConfiguredRepoPath =
                    typeof saveResult?.originalConfiguredRepoPath === "string" && saveResult.originalConfiguredRepoPath.trim()
                        ? saveResult.originalConfiguredRepoPath.trim()
                        : "";
                const originalConfiguredRepoPublicKey =
                    typeof saveResult?.originalConfiguredRepoPublicKey === "string" && saveResult.originalConfiguredRepoPublicKey.trim()
                        ? saveResult.originalConfiguredRepoPublicKey.trim()
                        : "";

                repoInput.value = storedPath;
                state.storageMode = persistence;
                state.storageDiagnostic = storageDiagnostic;
                if (originalConfiguredRepoPath) {
                    state.originalConfiguredRepoPath = originalConfiguredRepoPath;
                }
                if (originalConfiguredRepoPublicKey) {
                    state.originalConfiguredRepoPublicKey = originalConfiguredRepoPublicKey;
                }

                const prefetchHint = state.originalConfiguredRepoPath
                    ? ` Original configured repository (public key ${state.originalConfiguredRepoPublicKey}): ${state.originalConfiguredRepoPath}.`
                    : "";
                setMeta(`Ready [build: ${BUILD_ID}]. Executable: ${state.gitCommand}. Repository path saved (${persistence}).${prefetchHint} No command executed yet.`);

                if (!silent) {
                    notifySuccess(`Repository path saved (${persistence})`);
                }

                return storedPath;
            };

            const prefetchOriginalRepoPath = async (silent = false): Promise<string> => {
                const startedAt = Date.now();
                let fallbackCwd = String(repoInput.value || "").trim();
                try {
                    fallbackCwd = await persistRepoPath(true);
                    if (!fallbackCwd) {
                        throw new Error("Repository path is required before prefetch.");
                    }

                    const requestBuildResponse = await window.createBackendReq("UI_MESSAGE", {
                        handler: PREFETCH_REQUEST_HANDLER,
                        content: { cwd: fallbackCwd },
                    });

                    if (requestBuildResponse && (requestBuildResponse.ok === false || requestBuildResponse.success === false)) {
                        const code = typeof requestBuildResponse.code === "string" ? ` (${requestBuildResponse.code})` : "";
                        const message = typeof requestBuildResponse.error === "string"
                            ? requestBuildResponse.error
                            : "Failed to prepare original configured repository prefetch request.";
                        throw new Error(`${message}${code}`);
                    }

                    const originalConfiguredRepoPath =
                        typeof requestBuildResponse?.originalConfiguredRepoPath === "string"
                        && requestBuildResponse.originalConfiguredRepoPath.trim()
                            ? requestBuildResponse.originalConfiguredRepoPath.trim()
                            : "";
                    if (!originalConfiguredRepoPath) {
                        throw new Error("Original configured repository is unavailable.");
                    }

                    const originalConfiguredRepoPublicKey =
                        typeof requestBuildResponse?.originalConfiguredRepoPublicKey === "string"
                        && requestBuildResponse.originalConfiguredRepoPublicKey.trim()
                            ? requestBuildResponse.originalConfiguredRepoPublicKey.trim()
                            : state.originalConfiguredRepoPublicKey;
                    const requestEnvelope =
                        requestBuildResponse?.requestEnvelope && typeof requestBuildResponse.requestEnvelope === "object"
                            ? requestBuildResponse.requestEnvelope
                            : null;
                    let remoteOriginUrl = "";
                    if (requestEnvelope) {
                        setMeta(`Resolving remote origin through scoped Git execution (${originalConfiguredRepoPath})...`);
                        try {
                            const { response: inspectResponse } = await executePrivilegedRequestEnvelope(requestEnvelope, {
                                context: "Git remote origin inspection failed",
                                cwdHint: originalConfiguredRepoPath,
                            });
                            const remoteOriginStdout = String(inspectResponse?.result?.stdout || "");
                            remoteOriginUrl = remoteOriginStdout
                                .split(/\r?\n/)
                                .map((line) => line.trim())
                                .find((line) => line.length > 0) || "";
                        } catch (inspectError) {
                            const inspectMessage = inspectError instanceof Error ? inspectError.message : String(inspectError);
                            setMeta(`Remote origin inspection warning: ${inspectMessage}. Continuing without metadata.`);
                        }
                    } else {
                        setMeta("Remote origin inspection envelope is missing. Continuing without metadata prefetch.");
                    }

                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: PREFETCH_HANDLER,
                        content: {
                            cwd: originalConfiguredRepoPath,
                            remoteOriginUrl,
                        },
                    });
                    if (response && (response.ok === false || response.success === false)) {
                        const code = typeof response.code === "string" ? ` (${response.code})` : "";
                        const message = typeof response.error === "string"
                            ? response.error
                            : "Failed to prefetch original configured repository.";
                        throw new Error(`${message}${code}`);
                    }

                const resolvedOriginalConfiguredRepoPath =
                    typeof response?.originalConfiguredRepoPath === "string" && response.originalConfiguredRepoPath.trim()
                        ? response.originalConfiguredRepoPath.trim()
                        : originalConfiguredRepoPath;
                const resolvedOriginalConfiguredRepoPublicKey =
                    typeof response?.originalConfiguredRepoPublicKey === "string" && response.originalConfiguredRepoPublicKey.trim()
                        ? response.originalConfiguredRepoPublicKey.trim()
                        : originalConfiguredRepoPublicKey;
                const remoteRepository = response?.remoteRepository && typeof response.remoteRepository === "object"
                    ? response.remoteRepository as Record<string, unknown>
                    : null;
                const prefetchWarning = typeof response?.warning === "string" ? response.warning.trim() : "";
                const storageDiagnostic =
                    typeof response?.storageDiagnostic === "string" && response.storageDiagnostic.trim()
                        ? response.storageDiagnostic.trim()
                        : "";
                const persistence =
                    typeof response?.persistence === "string" && response.persistence.trim()
                        ? response.persistence.trim()
                        : state.storageMode;

                repoInput.value = resolvedOriginalConfiguredRepoPath;
                state.originalConfiguredRepoPath = resolvedOriginalConfiguredRepoPath;
                state.originalConfiguredRepoPublicKey = resolvedOriginalConfiguredRepoPublicKey;
                state.lastRemoteRepository = remoteRepository;
                state.storageMode = persistence;
                state.storageDiagnostic = storageDiagnostic;

                const warningSuffix = prefetchWarning
                    ? ` Metadata prefetch warning: ${prefetchWarning}.`
                    : "";
                setMeta(
                    `Ready [build: ${BUILD_ID}]. Executable: ${state.gitCommand}. Prefetched original configured repository ${resolvedOriginalConfiguredRepoPath} (public key ${resolvedOriginalConfiguredRepoPublicKey}, ${persistence}). Remote origin: ${remoteOriginUrl || "unavailable"}.${warningSuffix} No command executed yet.`
                );
                if (remoteRepository) {
                    setOutput(`$ prefetched remote repository metadata\n\n${JSON.stringify(remoteRepository, null, 2)}`);
                } else {
                    const warningText = prefetchWarning
                        ? `\nwarning: ${prefetchWarning}`
                        : "";
                    setOutput(`$ prefetch completed, but no remote repository metadata was returned.${warningText}`);
                }

                    if (!silent) {
                        const repositoryLabel =
                            remoteRepository && typeof remoteRepository.repository === "string" && remoteRepository.repository.trim()
                                ? ` (${remoteRepository.repository})`
                                : "";
                        if (prefetchWarning) {
                            notifyError(`Original repository prefetched with warning${repositoryLabel}: ${prefetchWarning}`);
                        } else {
                            notifySuccess(`Original configured repository prefetched${repositoryLabel}`);
                        }
                    }
                    pushExecutionHistory({
                        commandId: "prefetch",
                        label: "Prefetch Original Repo",
                        category: "profile",
                        status: "ok",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: resolvedOriginalConfiguredRepoPath,
                        errorCode: "",
                        errorMessage: "",
                    });
                    return resolvedOriginalConfiguredRepoPath;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    pushExecutionHistory({
                        commandId: "prefetch",
                        label: "Prefetch Original Repo",
                        category: "profile",
                        status: "failed",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: fallbackCwd || "(unknown)",
                        errorCode: parseErrorCodeFromMessage(message),
                        errorMessage: message,
                    });
                    const degradedPath = fallbackCwd || state.originalConfiguredRepoPath || String(repoInput.value || "").trim();
                    setMeta(`Prefetch degraded [build: ${BUILD_ID}]: ${message}`);
                    setOutput(`$ prefetch degraded\n\n${message}`);
                    if (!silent) {
                        notifyError(`Prefetch degraded: ${message}`);
                    }
                    return degradedPath;
                }
            };

            const runOperation = async (
                operationId: string,
                options: { append?: boolean; silent?: boolean; dryRun?: boolean } = {}
            ) => {
                const { append = false, silent = false, dryRun = false } = options;
                const operation = operationCatalog[operationId];
                if (!operation) {
                    throw new Error(`Unknown operation: ${operationId}`);
                }
                if (!state.runtimePrepared) {
                    throw new Error("Runtime is not prepared yet. Wait for initialization to finish.");
                }
                const startedAt = Date.now();

                let repoPath = "";
                try {
                    repoPath = await persistRepoPath(true);
                    if (!append) {
                        setOutput(`$ preparing ${operation.title}...\n`);
                    }
                    setMeta(`Running ${operation.title} in ${repoPath}...`);

                    const envelope = await window.createBackendReq("UI_MESSAGE", {
                        handler: BUILD_REQUEST_HANDLER,
                        content: {
                            operation: operationId,
                            cwd: repoPath,
                            dryRun,
                        },
                    });

                    if (!envelope || typeof envelope !== "object") {
                        throw new Error("Plugin backend did not return a structured privileged request envelope.");
                    }

                    const envelopeCorrelationId = resolveEnvelopeCorrelationId(envelope);
                    const backendErrorCode = typeof envelope?.code === "string" ? envelope.code.trim() : "";
                    const backendErrorText = typeof envelope?.error === "string" ? envelope.error.trim() : "";
                    const backendFailed = (
                        envelope?.ok === false
                        || envelope?.success === false
                        || Boolean(backendErrorCode)
                        || Boolean(backendErrorText)
                    );
                    if (backendFailed) {
                        const codeSuffix = backendErrorCode ? ` (${backendErrorCode})` : "";
                        throw new Error(
                            `Git request preparation failed${codeSuffix}: ${backendErrorText || "Plugin backend handler failed."}\nCorrelation ID: ${envelopeCorrelationId || "unknown"}`
                        );
                    }

                    const { response } = await executePrivilegedRequestEnvelope(envelope, {
                        context: "Git operation failed",
                        cwdHint: repoPath,
                    });

                    const result = response.result || {};
                    const stdout = String(result.stdout || "");
                    const stderr = String(result.stderr || "");
                    const header = [
                        `$ ${result.command || state.gitCommand} ${Array.isArray(result.args) ? result.args.join(" ") : operation.args.join(" ")}`,
                        `# cwd: ${result.cwd || repoPath}`,
                        `# mode: ${dryRun ? "dry-run" : "apply"}`,
                        `# correlationId: ${response.correlationId || envelopeCorrelationId || "unknown"}`,
                    ].join("\n");
                    const payload = stdout || stderr
                        ? [stdout, stderr ? `[stderr]\n${stderr}` : ""].filter(Boolean).join("\n\n")
                        : "(no output)";
                    const block = `${header}\n\n${payload}`;

                    if (append) {
                        const previous = String(outputCode.textContent || "").trim();
                        setOutput(`${previous}\n\n${block}`.trim());
                    } else {
                        setOutput(block);
                    }

                    if (operationId === "status") {
                        state.lastStatus = parseStatusOutput(stdout);
                        renderSummary(state.lastStatus);
                        renderStagedFilesHint(state.lastStatus);
                    }

                    const finalCorrelationId = response.correlationId || envelopeCorrelationId || "unknown";
                    pushExecutionHistory({
                        commandId: operationId,
                        label: operation.title,
                        category: "operation",
                        status: "ok",
                        dryRun,
                        durationMs: Date.now() - startedAt,
                        correlationId: finalCorrelationId,
                        repoPath: repoPath || "(unknown)",
                        errorCode: "",
                        errorMessage: "",
                    });
                    setMeta(`Last run: ${operation.title}${dryRun ? " [dry-run]" : ""} succeeded (correlation: ${finalCorrelationId}). Path persistence: ${state.storageMode}.`);
                    if (!silent) {
                        notifySuccess(`${operation.title}${dryRun ? " (dry-run)" : ""} completed`);
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    pushExecutionHistory({
                        commandId: operationId,
                        label: operation.title,
                        category: "operation",
                        status: "failed",
                        dryRun,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: repoPath || String(repoInput.value || "").trim() || "(unknown)",
                        errorCode: parseErrorCodeFromMessage(message),
                        errorMessage: message,
                    });
                    throw error;
                }
            };

            const runSnapshot = async () => {
                setBusy(true);
                const startedAt = Date.now();
                try {
                    const sequence = ["status", "branches", "log", "diffStat", "showHead"] as const;
                    setMeta("Running snapshot sequence (status, branches, log, diff stat, show head)...");
                    setOutput("$ running Git snapshot sequence...");
                    for (let index = 0; index < sequence.length; index += 1) {
                        const operationId = sequence[index];
                        await runOperation(operationId, { append: index > 0, silent: true });
                    }
                    setMeta(`Snapshot completed successfully. Path persistence: ${state.storageMode}.`);
                    notifySuccess("Git snapshot completed");
                    pushExecutionHistory({
                        commandId: "snapshot",
                        label: "Run Snapshot Sequence",
                        category: "inspect",
                        status: "ok",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: String(repoInput.value || "").trim() || "(unknown)",
                        errorCode: "",
                        errorMessage: "",
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setOutput(`Snapshot failed:\n${message}`);
                    setMeta(`Snapshot failed: ${message}`);
                    notifyError("Snapshot failed");
                    pushExecutionHistory({
                        commandId: "snapshot",
                        label: "Run Snapshot Sequence",
                        category: "inspect",
                        status: "failed",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: String(repoInput.value || "").trim() || "(unknown)",
                        errorCode: parseErrorCodeFromMessage(message),
                        errorMessage: message,
                    });
                } finally {
                    setBusy(false);
                }
            };

            const requestAiAssistance = async (
                task: "commit-message" | "summarize-output" | "suggest-next-command"
            ): Promise<string> => {
                const startedAt = Date.now();
                try {
                    if (!state.aiAssistantsLoaded) {
                        await fetchAssistants(true);
                    }
                    const repoPath = String(repoInput.value || "").trim();
                    const selectedAssistant = resolveSelectedAssistant();
                    if (task === "commit-message" && (!state.lastStatus || state.lastStatus.staged === 0)) {
                        throw new Error("No staged files detected. Run Status and stage changes before generating a commit message.");
                    }
                    const prompt = task === "commit-message"
                        ? [
                            "Generate a concise conventional-commit-style message for staged git changes.",
                            "Use only staged files as scope context.",
                            "Prefer imperative mood and keep it under 72 characters when possible.",
                        ].join(" ")
                        : (task === "summarize-output"
                            ? [
                                "Summarize the latest command output for an operator.",
                                "Keep 3-5 short bullet points with key signals only.",
                                "Do not generate commit messages.",
                            ].join(" ")
                            : [
                                "Suggest the safest next Git command based on repository status/output.",
                                "Include one concrete command plus brief reason.",
                                "Do not generate commit messages.",
                            ].join(" "));
                    const outputText = String(outputCode.textContent || "");
                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: AI_ASSIST_HANDLER,
                        content: {
                            task,
                            repoPath,
                            summary: {
                                ...state.lastStatus,
                                stagedFiles: Array.isArray(state.lastStatus?.stagedFiles) ? state.lastStatus.stagedFiles : [],
                            },
                            prompt: `${prompt} ${String(aiPromptInput.value || "").trim()}`.trim(),
                            commandOutput: outputText,
                            recentRuns: state.executionHistory.slice(0, 8),
                            assistantId: selectedAssistant?.id || state.selectedAssistantId || undefined,
                            assistantPurpose: AI_ASSISTANT_PURPOSE || "automation",
                            assistantProvider: selectedAssistant?.provider || AI_ASSISTANT_PROVIDER || undefined,
                            assistantModel: selectedAssistant?.model || AI_ASSISTANT_MODEL || undefined,
                            stagedFiles: Array.isArray(state.lastStatus?.stagedFiles) ? state.lastStatus.stagedFiles : [],
                        },
                    });
                    if (response && (response.ok === false || response.success === false)) {
                        const code = typeof response.code === "string" ? ` (${response.code})` : "";
                        const message = typeof response.error === "string"
                            ? response.error
                            : `AI assistance failed for task "${task}".`;
                        throw new Error(`${message}${code}`);
                    }

                    const aiText = typeof response?.commitMessage === "string"
                        ? response.commitMessage.trim()
                        : (
                            typeof response?.message === "string"
                                ? response.message.trim()
                                : (typeof response?.text === "string" ? response.text.trim() : "")
                        );
                    if (!aiText) {
                        throw new Error(`AI provider returned an empty response for task "${task}".`);
                    }

                    if (task === "commit-message") {
                        commitMessageInput.value = aiText;
                    } else if (task === "summarize-output") {
                        setOutput(`$ ai summary\n\n${aiText}`);
                    } else if (task === "suggest-next-command") {
                        setMeta(`AI suggestion: ${aiText}`);
                    }
                    const source = typeof response?.source === "string" ? response.source : "unknown";
                    const warning = typeof response?.warning === "string" ? response.warning.trim() : "";
                    const assistantInfo = selectedAssistant
                        ? `${selectedAssistant.name} (${selectedAssistant.provider || "unknown"} / ${selectedAssistant.model || "default"})`
                        : `host default (${AI_ASSISTANT_PURPOSE || "automation"})`;
                    setMeta(`AI assistance completed for task "${task}" (${source}, assistant: ${assistantInfo}).`);
                    if (warning) {
                        notifyError(warning);
                    } else {
                        notifySuccess(`AI assistance completed (${task})`);
                    }
                    pushExecutionHistory({
                        commandId: `ai:${task}`,
                        label: `AI Assist (${task})`,
                        category: "workspace",
                        status: "ok",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: repoPath || "(unknown)",
                        errorCode: "",
                        errorMessage: "",
                    });
                    return aiText;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    pushExecutionHistory({
                        commandId: `ai:${task}`,
                        label: `AI Assist (${task})`,
                        category: "workspace",
                        status: "failed",
                        dryRun: false,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: String(repoInput.value || "").trim() || "(unknown)",
                        errorCode: parseErrorCodeFromMessage(message),
                        errorMessage: message,
                    });
                    throw error;
                }
            };

            const runCommitStaged = async (dryRun = false) => {
                const startedAt = Date.now();
                let repoPath = "";
                const message = String(commitMessageInput.value || "").trim();
                if (!message) {
                    throw new Error("Commit message is required. Generate one with AI or enter it manually.");
                }

                try {
                    repoPath = await persistRepoPath(true);
                    setMeta(`Running commit in ${repoPath}...`);
                    const envelope = await window.createBackendReq("UI_MESSAGE", {
                        handler: BUILD_COMMIT_REQUEST_HANDLER,
                        content: {
                            cwd: repoPath,
                            message,
                            dryRun,
                        },
                    });

                    if (!envelope || typeof envelope !== "object") {
                        throw new Error("Plugin backend did not return a structured commit request envelope.");
                    }

                    const envelopeCorrelationId = resolveEnvelopeCorrelationId(envelope);
                    const backendErrorCode = typeof envelope?.code === "string" ? envelope.code.trim() : "";
                    const backendErrorText = typeof envelope?.error === "string" ? envelope.error.trim() : "";
                    if (
                        envelope?.ok === false
                        || envelope?.success === false
                        || Boolean(backendErrorCode)
                        || Boolean(backendErrorText)
                    ) {
                        const codeSuffix = backendErrorCode ? ` (${backendErrorCode})` : "";
                        throw new Error(
                            `Commit request preparation failed${codeSuffix}: ${backendErrorText || "Plugin backend handler failed."}\nCorrelation ID: ${envelopeCorrelationId || "unknown"}`
                        );
                    }

                    const { response } = await executePrivilegedRequestEnvelope(envelope, {
                        context: "Git commit failed",
                        cwdHint: repoPath,
                    });
                    const result = response.result || {};
                    const stdout = String(result.stdout || "");
                    const stderr = String(result.stderr || "");
                    const header = [
                        `$ ${result.command || state.gitCommand} ${Array.isArray(result.args) ? result.args.join(" ") : operationCatalog.commitStaged.args.join(" ")}`,
                        `# cwd: ${result.cwd || repoPath}`,
                        `# mode: ${dryRun ? "dry-run" : "apply"}`,
                        `# correlationId: ${response.correlationId || envelopeCorrelationId || "unknown"}`,
                    ].join("\n");
                    const payload = stdout || stderr
                        ? [stdout, stderr ? `[stderr]\n${stderr}` : ""].filter(Boolean).join("\n\n")
                        : "(no output)";
                    setOutput(`${header}\n\n${payload}`);

                    pushExecutionHistory({
                        commandId: "commitStaged",
                        label: "Commit Staged Changes",
                        category: "workspace",
                        status: "ok",
                        dryRun,
                        durationMs: Date.now() - startedAt,
                        correlationId: response.correlationId || envelopeCorrelationId || "unknown",
                        repoPath: repoPath || "(unknown)",
                        errorCode: "",
                        errorMessage: "",
                    });
                    setMeta(`Commit ${dryRun ? "(dry-run) " : ""}completed successfully.`);
                    notifySuccess(`Commit ${dryRun ? "(dry-run) " : ""}completed`);
                } catch (error) {
                    const errMessage = error instanceof Error ? error.message : String(error);
                    pushExecutionHistory({
                        commandId: "commitStaged",
                        label: "Commit Staged Changes",
                        category: "workspace",
                        status: "failed",
                        dryRun,
                        durationMs: Date.now() - startedAt,
                        correlationId: "",
                        repoPath: repoPath || String(repoInput.value || "").trim() || "(unknown)",
                        errorCode: parseErrorCodeFromMessage(errMessage),
                        errorMessage: errMessage,
                    });
                    throw error;
                }
            };

            const bindOperation = (button: HTMLButtonElement, operationId: string) => {
                button.addEventListener("click", async () => {
                    setBusy(true);
                    try {
                        await runOperation(operationId);
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        setOutput(`Operation failed:\n${message}`);
                        setMeta(`Last operation failed: ${message}`);
                        notifyError("Git operation failed");
                    } finally {
                        setBusy(false);
                    }
                });
            };

            bindOperation(statusButton, "status");
            bindOperation(branchesButton, "branches");
            bindOperation(logButton, "log");
            bindOperation(diffButton, "diffStat");
            bindOperation(showButton, "showHead");
            bindOperation(fetchButton, "fetch");
            bindOperation(pullButton, "pullFFOnly");
            commitButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await runCommitStaged(false);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setOutput(`Commit failed:\n${message}`);
                    setMeta(`Commit failed: ${message}`);
                    notifyError("Commit failed");
                } finally {
                    setBusy(false);
                }
            });
            aiCommitMessageButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await requestAiAssistance("commit-message");
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`AI commit message generation failed: ${message}`);
                    notifyError("AI commit message generation failed");
                } finally {
                    setBusy(false);
                }
            });
            aiSummarizeOutputButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await requestAiAssistance("summarize-output");
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`AI output summary failed: ${message}`);
                    notifyError("AI output summary failed");
                } finally {
                    setBusy(false);
                }
            });
            aiSuggestNextButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await requestAiAssistance("suggest-next-command");
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`AI next-step suggestion failed: ${message}`);
                    notifyError("AI next-step suggestion failed");
                } finally {
                    setBusy(false);
                }
            });
            aiRefreshAssistantsButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await fetchAssistants(false, true);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`AI assistant refresh failed: ${message}`);
                    notifyError("AI assistant refresh failed");
                } finally {
                    setBusy(false);
                }
            });
            aiAssistantSelect.addEventListener("change", () => {
                state.selectedAssistantId = String(aiAssistantSelect.value || "").trim();
                const selectedAssistant = state.aiAssistants.find((item) => item.id === state.selectedAssistantId) || null;
                if (selectedAssistant) {
                    setMeta(`AI assistant selected: ${selectedAssistant.name} (${selectedAssistant.provider || "unknown"} / ${selectedAssistant.model || "default"}).`);
                    return;
                }
                setMeta(`AI assistant routing uses host default (${AI_ASSISTANT_PURPOSE || "automation"} purpose).`);
            });

            savePathButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    await persistRepoPath(false);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`Save path failed: ${message}`);
                    notifyError("Failed to save repository path");
                } finally {
                    setBusy(false);
                }
            });

            prefetchOriginalButton.addEventListener("click", async () => {
                setBusy(true);
                try {
                    const originalPath = await prefetchOriginalRepoPath(false);
                    repoInput.value = originalPath;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`Prefetch failed: ${message}`);
                    notifyError("Failed to prefetch original repository");
                } finally {
                    setBusy(false);
                }
            });

            snapshotButton.addEventListener("click", () => {
                void runSnapshot();
            });

            repoInput.addEventListener("blur", () => {
                void persistRepoPath(true).catch(() => {
                    // Keep blur-save best-effort; explicit Save button surfaces errors.
                });
            });

            repoInput.addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    void persistRepoPath(false).catch((error) => {
                        const message = error instanceof Error ? error.message : String(error);
                        setMeta(`Save path failed: ${message}`);
                    });
                }
            });

            commitMessageInput.addEventListener("keydown", (event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    setBusy(true);
                    void runCommitStaged(event.shiftKey)
                        .catch((error) => {
                            const message = error instanceof Error ? error.message : String(error);
                            setOutput(`Commit failed:\n${message}`);
                            setMeta(`Commit failed: ${message}`);
                            notifyError("Commit failed");
                        })
                        .finally(() => {
                            setBusy(false);
                        });
                }
            });

            const prepareRuntime = async () => {
                try {
                    setMeta("Preparing runtime...");
                    const response = await window.createBackendReq("UI_MESSAGE", {
                        handler: PREPARE_HANDLER,
                        content: {},
                    });

                    if (response && typeof response === "object") {
                        if (response.ok === false || response.success === false) {
                            const code = typeof response.code === "string" ? ` (${response.code})` : "";
                            const errorText = typeof response.error === "string"
                                ? response.error
                                : "Unknown runtime preparation error.";
                            setMeta(`Runtime preparation degraded${code}: ${errorText}`);
                        }
                        if (typeof response.gitCommand === "string" && response.gitCommand.trim()) {
                            state.gitCommand = response.gitCommand.trim();
                        }
                        if (typeof response.defaultRepoPath === "string" && response.defaultRepoPath.trim()) {
                            repoInput.value = response.defaultRepoPath.trim();
                        }
                        if (typeof response.storageMode === "string" && response.storageMode.trim()) {
                            state.storageMode = response.storageMode.trim();
                        }
                        if (typeof response.storageDiagnostic === "string" && response.storageDiagnostic.trim()) {
                            state.storageDiagnostic = response.storageDiagnostic.trim();
                        } else {
                            state.storageDiagnostic = "";
                        }
                        if (typeof response.originalConfiguredRepoPath === "string" && response.originalConfiguredRepoPath.trim()) {
                            state.originalConfiguredRepoPath = response.originalConfiguredRepoPath.trim();
                        }
                        if (typeof response.originalConfiguredRepoPublicKey === "string" && response.originalConfiguredRepoPublicKey.trim()) {
                            state.originalConfiguredRepoPublicKey = response.originalConfiguredRepoPublicKey.trim();
                        }
                        const lastAction = typeof response.lastAction === "string"
                            ? response.lastAction.trim()
                            : "none";
                        const prefetchHint = state.originalConfiguredRepoPath
                            ? ` Original configured repository (public key ${state.originalConfiguredRepoPublicKey}): ${state.originalConfiguredRepoPath}.`
                            : "";
                        setMeta(`Ready [build: ${BUILD_ID}]. Executable: ${state.gitCommand}. Storage mode: ${state.storageMode}.${prefetchHint} Last action: ${lastAction}. No command executed yet.`);
                    } else {
                        setMeta(`Ready [build: ${BUILD_ID}]. Executable: ${state.gitCommand}. Storage mode: ${state.storageMode}. No command executed yet.`);
                    }

                    state.runtimePrepared = true;
                    renderSummary(null);
                    renderStagedFilesHint(null);
                    renderExecutionHistory();
                    setOutput("$ runtime ready. choose an operation or run snapshot.");
                    await fetchAssistants(true).catch((error) => {
                        const message = error instanceof Error ? error.message : String(error);
                        setMeta(`Ready [build: ${BUILD_ID}]. Executable: ${state.gitCommand}. Storage mode: ${state.storageMode}. Assistant discovery unavailable: ${message}`);
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setMeta(`Runtime preparation failed: ${message}`);
                    setOutput(`Runtime preparation failed:\n${message}`);
                }
            };

            void prepareRuntime();
        }

        return defineRenderOnLoad(gitOperationsRenderOnLoad, {
            language: "typescript",
            description: "Interactive iframe runtime wiring for Git operations, storage persistence, and scoped privileged action flows.",
        });
    }
}

new GitOperationsPlugin();

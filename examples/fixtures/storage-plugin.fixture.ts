import { FDOInterface, FDO_SDK, PluginCapability, PluginMetadata, PluginRegistry, StoreType } from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Scoped storage usage.
 * Pattern intent: in-memory session data plus optional JSON persistence when host storage is configured.
 *
 * Why this fixture exists:
 * - demonstrates `default` vs `json` store roles
 * - keeps JSON-store fallback explicit
 * - uses backend handlers plus UI_MESSAGE for real storage interactions
 * - gives authors a production-grade starting point for preference/state plugins
 */
export default class StorageFixturePlugin extends FDO_SDK implements FDOInterface {
  private static readonly HANDLERS = {
    GET_SNAPSHOT: "storageFixture.v2.getSnapshot",
    SAVE_PREFERENCE: "storageFixture.v2.savePreference",
    RECORD_ACTION: "storageFixture.v2.recordAction",
  } as const;

  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Storage",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for plugin-scoped store usage",
    icon: "database",
  };

  private sessionStore: StoreType = PluginRegistry.useStore("default");
  private persistentStore?: StoreType;
  private jsonStoreAvailable = false;
  private readonly THEME_KEY = "theme";
  private readonly LAST_VISIT_KEY = "lastVisitAt";
  private readonly VISITS_KEY = "visits";
  private readonly LAST_ACTION_KEY = "lastAction";

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  declareCapabilities(): PluginCapability[] {
    return ["storage", "storage.json"];
  }

  init(): void {
    const visitCount = (this.sessionStore.get<number>(this.VISITS_KEY) ?? 0) + 1;
    this.sessionStore.set(this.VISITS_KEY, visitCount);
    this.sessionStore.set(this.LAST_ACTION_KEY, "fixture-initialized");

    try {
      this.persistentStore = PluginRegistry.useStore("json");
      this.jsonStoreAvailable = true;
    } catch (error) {
      this.jsonStoreAvailable = false;
      this.warn("JSON store unavailable for storage fixture. Falling back to default store only.", { error });
    }

    if (this.persistentStore) {
      this.persistentStore.set(this.LAST_VISIT_KEY, new Date().toISOString());
    }

    this.info("Storage fixture initialized", {
      plugin: this.metadata.name,
      jsonStoreAvailable: this.jsonStoreAvailable,
      visitCount,
    });

    PluginRegistry.registerHandler(StorageFixturePlugin.HANDLERS.GET_SNAPSHOT, () => this.getSnapshot());
    PluginRegistry.registerHandler(StorageFixturePlugin.HANDLERS.SAVE_PREFERENCE, (data: unknown) => this.savePreference(data));
    PluginRegistry.registerHandler(StorageFixturePlugin.HANDLERS.RECORD_ACTION, (data: unknown) => this.recordAction(data));
  }

  private getSnapshot() {
    const persistedTheme = this.jsonStoreAvailable
      ? this.persistentStore?.get<string>(this.THEME_KEY) ?? "not set"
      : this.sessionStore.get<string>(this.THEME_KEY) ?? "not set (session fallback)";

    return {
      jsonStoreAvailable: this.jsonStoreAvailable,
      storageMode: this.jsonStoreAvailable ? "persistent-json" : "session-fallback",
      visits: this.sessionStore.get<number>(this.VISITS_KEY) ?? 0,
      lastAction: this.sessionStore.get<string>(this.LAST_ACTION_KEY) ?? "none",
      theme: persistedTheme,
      lastVisitAt: this.persistentStore?.get<string>(this.LAST_VISIT_KEY) ?? "JSON store not configured",
    };
  }

  private savePreference(data: unknown) {
    const theme =
      typeof data === "object" &&
      data !== null &&
      "theme" in data &&
      typeof (data as { theme?: unknown }).theme === "string"
        ? (data as { theme: string }).theme
        : "";

    if (!theme) {
      return {
        ok: false,
        error: "Theme is required.",
      };
    }

    if (!this.persistentStore) {
      this.sessionStore.set(this.THEME_KEY, theme);
      this.sessionStore.set(this.LAST_ACTION_KEY, `saved-theme-session:${theme}`);
      return {
        ok: true,
        theme,
        persistence: "session-fallback",
        message: "JSON store is unavailable in this host runtime. Theme was saved to session storage only.",
      };
    }

    this.persistentStore.set(this.THEME_KEY, theme);
    this.sessionStore.set(this.LAST_ACTION_KEY, `saved-theme:${theme}`);

    return {
      ok: true,
      theme,
      persistence: "persistent-json",
    };
  }

  private recordAction(data: unknown) {
    const action =
      typeof data === "object" &&
      data !== null &&
      "action" in data &&
      typeof (data as { action?: unknown }).action === "string"
        ? (data as { action: string }).action
        : "manual-action";

    this.sessionStore.set(this.LAST_ACTION_KEY, action);

    return {
      ok: true,
      action,
    };
  }

  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this.metadata.name}</h1>
        <p><strong>Fixture handler version:</strong> <code>storageFixture.v2.*</code></p>
        <p>Use this fixture when your plugin needs plugin-scoped state plus optional JSON persistence.</p>
        <p>Start by clicking <strong>Refresh Snapshot</strong> to inspect current session state and JSON-store availability.</p>
        <p><strong>Save Theme: dark</strong> always works. If JSON storage is unavailable, the fixture saves the theme to session storage and labels that as a non-persistent fallback.</p>
        <p><strong>Record Session Action</strong> always writes to the in-memory session store and should succeed even when JSON storage is unavailable.</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
          <button id="storage-refresh" class="pure-button" type="button">Refresh Snapshot</button>
          <button id="storage-save-theme" class="pure-button pure-button-primary" type="button">Save Theme: dark</button>
          <button id="storage-record-action" class="pure-button" type="button">Record Session Action</button>
        </div>
        <pre id="storage-output" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 140px;">Snapshot will load after initialization...</pre>
      </div>
    `;
  }

  renderOnLoad(): string {
    return `
      (() => {
        const refreshButton = document.getElementById("storage-refresh");
        const saveThemeButton = document.getElementById("storage-save-theme");
        const recordActionButton = document.getElementById("storage-record-action");
        const output = document.getElementById("storage-output");

        if (!refreshButton || !saveThemeButton || !recordActionButton || !output) {
          return;
        }

        const callHandler = (handler, content = {}) =>
          window.createBackendReq("UI_MESSAGE", { handler, content });

        const setOutput = (value) => {
          output.textContent = typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2);
        };

        const refresh = async () => {
          try {
            const snapshot = await callHandler("${StorageFixturePlugin.HANDLERS.GET_SNAPSHOT}", {});
            setOutput(snapshot);
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        refreshButton.addEventListener("click", () => {
          void refresh();
        });

        saveThemeButton.addEventListener("click", async () => {
          setOutput("Saving theme...");
          try {
            const result = await callHandler("${StorageFixturePlugin.HANDLERS.SAVE_PREFERENCE}", { theme: "dark" });
            if (result && result.ok) {
              await refresh();
              return;
            }

            setOutput(result);
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });

        recordActionButton.addEventListener("click", async () => {
          setOutput("Recording action...");
          try {
            await callHandler("${StorageFixturePlugin.HANDLERS.RECORD_ACTION}", {
              action: "storage-fixture-ui-click",
            });
            await refresh();
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });

        void refresh();
      })();
    `;
  }
}

new StorageFixturePlugin();

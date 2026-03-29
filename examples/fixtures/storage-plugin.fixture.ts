import { FDOInterface, FDO_SDK, PluginMetadata, PluginRegistry, StoreType } from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Scoped storage usage.
 * Pattern intent: in-memory state with optional JSON persistence when host root is configured.
 */
export default class StorageFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Storage",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for plugin-scoped store usage",
    icon: "database",
  };

  private sessionStore: StoreType = PluginRegistry.useStore("default");
  private jsonStore?: StoreType;

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    const visitCount = (this.sessionStore.get<number>("visits") ?? 0) + 1;
    this.sessionStore.set("visits", visitCount);

    try {
      this.jsonStore = PluginRegistry.useStore("json");
      this.jsonStore.set("lastVisitAt", new Date().toISOString());
    } catch (error) {
      this.warn("JSON store unavailable for fixture (expected without configured storage root).", { error });
    }
  }

  render(): string {
    const visits = this.sessionStore.get<number>("visits") ?? 0;
    const persisted = this.jsonStore?.get<string>("lastVisitAt");

    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Session visits: ${visits}</p>
        <p>Last persisted visit: ${persisted ?? "JSON store not configured"}</p>
      </div>
    `;
  }
}

new StorageFixturePlugin();

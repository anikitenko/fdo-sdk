import { FDOInterface, FDO_SDK, PluginMetadata } from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Minimal plugin baseline.
 * Pattern intent: smallest valid plugin with predictable lifecycle behavior.
 */
export default class MinimalFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Minimal Plugin",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Minimal reference fixture for plugin scaffolding",
    icon: "cube",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  init(): void {
    this.info("Minimal fixture initialized");
  }

  render(): string {
    return `
      <div style={{ padding: "16px" }}>
        <h1>${this._metadata.name}</h1>
        <p>Use this fixture as the baseline for new plugins.</p>
      </div>
    `;
  }
}

new MinimalFixturePlugin();

import { FDOInterface, FDO_SDK, PluginMetadata } from "@anikitenko/fdo-sdk";

/**
 * Scenario fixture: Minimal plugin baseline.
 * Pattern intent: smallest production-grade scaffold with predictable lifecycle behavior.
 *
 * Why this fixture exists:
 * - clean metadata shape
 * - explicit init/render lifecycle
 * - no DOM-helper or bridge complexity
 * - safe first customization point for new plugins
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
    this.info("Minimal fixture initialized", {
      plugin: this.metadata.name,
      version: this.metadata.version,
    });
  }

  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this.metadata.name}</h1>
        <p>Use this fixture as the smallest stable starting point for new plugins.</p>
        <p>Customize metadata first, then add handlers, storage, UI helpers, or operator flows only when your plugin actually needs them.</p>
      </div>
    `;
  }
}

new MinimalFixturePlugin();

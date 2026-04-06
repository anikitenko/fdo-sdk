/**
 * Example 1: Basic Plugin Creation
 * 
 * This example demonstrates the minimal requirements to create a working FDO plugin.
 * It covers the core plugin lifecycle (initialization and rendering) and basic metadata structure.
 *
 * This is a learning example, not the primary production authoring entry point.
 * For real plugin work, start from the fixture set in `examples/fixtures/` first.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Understand the FDO_SDK base class and FDOInterface
 * - Learn how to implement required lifecycle methods (init and render)
 * - See how to structure plugin metadata
 * - Use the built-in logging system
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Log "BasicPlugin initialized!" to the console during initialization
 * 2. Display a simple welcome message with the plugin name and version
 * 3. Show a brief description of what the plugin does
 */

import { FDO_SDK, FDOInterface, PluginMetadata, DOMText, DOMNested } from "@anikitenko/fdo-sdk";

/**
 * BasicPlugin demonstrates the minimal plugin structure.
 * 
 * All plugins must:
 * 1. Extend the FDO_SDK base class
 * 2. Implement the FDOInterface interface
 * 3. Define metadata (name, version, author, description, icon)
 * 4. Implement init() and render() methods
 *
 * For production-oriented scaffolding, prefer:
 * - `fixtures/minimal-plugin.fixture.ts` for a baseline plugin
 * - `fixtures/operator-*.fixture.ts` for DevOps/SRE/operator workflows
 */
export default class BasicPlugin extends FDO_SDK implements FDOInterface {
  /**
   * Plugin metadata - required by FDOInterface.
   * This information is used by the FDO application to identify and describe your plugin.
   * 
   * CUSTOMIZE HERE: Replace these values with your own plugin information
   */
  private readonly _metadata: PluginMetadata = {
    name: "Basic Plugin Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "A minimal example demonstrating basic plugin creation and lifecycle",
    icon: "cog"
  };

  /**
   * Getter for plugin metadata.
   * Required by FDOInterface.
   */
  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize the plugin.
   * 
   * This method is called once when the plugin is loaded by the FDO application.
   * Use this method to:
   * - Set up initial state
   * - Register message handlers (covered in example 02)
   * - Initialize storage (covered in example 03)
   * - Perform any setup tasks
   * 
   * COMMON PITFALL: Do not perform long-running operations in init().
   * The init() method should complete quickly to avoid blocking the application startup.
   * For async operations, consider using promises or deferring work to handlers.
   */
  init(): void {
    try {
      this.log("BasicPlugin initialized!");
      
      
    } catch (error) {
      this.error(error as Error);
      
    }
  }

  /**
   * Render the plugin UI.
   * 
   * This method is called when the plugin needs to display its user interface.
   * It should return a UI string for the FDO iframe host pipeline.
   *
   * The SDK and host transport serialize this value separately. Plugin code should
   * return the UI string directly from render().
   * 
   * CUSTOMIZE HERE: Replace this simple HTML with your own UI
   * 
   * COMMON PITFALL: The render() method should return quickly.
   * For complex UIs, consider using the DOM helper classes (see example 05)
   * or breaking the UI into smaller components.
   * 
   * @returns UI string representing the plugin's user interface
   */
  render(): string {
    try {
      const domText = new DOMText();
      const domNested = new DOMNested();
      
      // Create main container
      const mainContent = domNested.createBlockDiv([
        // Header section
        domText.createHText(1, `Welcome to ${this._metadata.name}`),
        domText.createPText([
          domText.createStrongText('Version:'),
          ` ${this._metadata.version}`
        ].join('')),
        domText.createPText([
          domText.createStrongText('Author:'),
          ` ${this._metadata.author}`
        ].join('')),
        domText.createPText(this._metadata.description),
        
        // What's Next section
        domNested.createBlockDiv([
          domText.createHText(3, 'What\'s Next?'),
          domText.createPText('This is a learning example. For production-oriented authoring, start from the canonical fixture set first:'),
          domNested.createList([
            domNested.createListItem(['Use fixtures/minimal-plugin.fixture.ts for the smallest stable scaffold']),
            domNested.createListItem(['Use operator fixtures for kubectl, terraform, or host-specific operational tooling']),
            domNested.createListItem(['Read docs/SAFE_PLUGIN_AUTHORING.md and docs/OPERATOR_PLUGIN_PATTERNS.md before expanding capabilities'])
          ]),
          domText.createPText('After choosing the right fixture baseline, use the numbered examples to study individual SDK features:'),
          domNested.createList([
            domNested.createListItem(['See example 02 for interactive UI with buttons and forms']),
            domNested.createListItem(['See example 03 for data persistence']),
            domNested.createListItem(['See example 04 for UI extensions (quick actions and side panels)']),
            domNested.createListItem(['See example 05 for advanced DOM generation and styling']),
            domNested.createListItem(['See example 08 and example 09 only when you need lower-level privileged transport details'])
          ])
        ], { 
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '5px'
          }
        })
      ], {
        style: {
          padding: '20px',
          fontFamily: 'Arial, sans-serif'
        }
      });
      
      return mainContent;
      
    } catch (error) {
      this.error(error as Error);
      
      return `
        <div style="padding: 20px; color: red;">
          <h2>Error rendering plugin</h2>
          <p>An error occurred while rendering the plugin UI. Check the console for details.</p>
        </div>
      `;
    }
  }
}

/**
 * Key Takeaways:
 * 
 * 1. All plugins must extend FDO_SDK and implement FDOInterface
 * 2. The metadata property is required and must include name, version, author, description, and icon
 * 3. The init() method is called once during plugin load - use it for setup
 * 4. The render() method returns the UI string for the plugin host pipeline
 * 5. Use this.log() for informational messages and this.error() for error logging
 * 6. Always handle errors in init() and render() to prevent plugin failures
 * 7. For real plugin work, choose the right fixture first instead of copying a learning example by default
 * 
 * Next Steps:
 * - Choose the closest fixture in `examples/fixtures/` as your starting point
 * - Use this file only to understand the minimum lifecycle contract
 * - Customize the metadata with your plugin information
 * - Modify the render() method to display your own UI
 * - Add your initialization logic to the init() method
 * - Test your plugin in the FDO application
 */

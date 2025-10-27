/**
 * Example 1: Basic Plugin Creation
 * 
 * This example demonstrates the minimal requirements to create a working FDO plugin.
 * It covers the core plugin lifecycle (initialization and rendering) and basic metadata structure.
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

import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

/**
 * BasicPlugin demonstrates the minimal plugin structure.
 * 
 * All plugins must:
 * 1. Extend the FDO_SDK base class
 * 2. Implement the FDOInterface interface
 * 3. Define metadata (name, version, author, description, icon)
 * 4. Implement init() and render() methods
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
    icon: "icon.png"
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
   * It should return an HTML string that defines the plugin's UI.
   * 
   * The returned HTML will be rendered in the FDO application's plugin container.
   * 
   * CUSTOMIZE HERE: Replace this simple HTML with your own UI
   * 
   * COMMON PITFALL: The render() method should return quickly.
   * For complex UIs, consider using the DOM helper classes (see example 05)
   * or breaking the UI into smaller components.
   * 
   * @returns HTML string representing the plugin's user interface
   */
  render(): string {
    try {
      
      const html = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1>Welcome to ${this._metadata.name}</h1>
          <p><strong>Version:</strong> ${this._metadata.version}</p>
          <p><strong>Author:</strong> ${this._metadata.author}</p>
          <p>${this._metadata.description}</p>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px;">
            <h3>What's Next?</h3>
            <p>This is a basic plugin example. To learn more advanced features:</p>
            <ul>
              <li>See example 02 for interactive UI with buttons and forms</li>
              <li>See example 03 for data persistence</li>
              <li>See example 04 for UI extensions (quick actions and side panels)</li>
              <li>See example 05 for advanced DOM generation and styling</li>
            </ul>
          </div>
        </div>
      `;
      
      return html;
      
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
 * 4. The render() method returns HTML that defines the plugin's UI
 * 5. Use this.log() for informational messages and this.error() for error logging
 * 6. Always handle errors in init() and render() to prevent plugin failures
 * 
 * Next Steps:
 * - Copy this file to your project
 * - Customize the metadata with your plugin information
 * - Modify the render() method to display your own UI
 * - Add your initialization logic to the init() method
 * - Test your plugin in the FDO application
 */

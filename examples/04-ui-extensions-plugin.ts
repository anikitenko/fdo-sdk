/**
 * Example 4: Quick Actions and Side Panel Integration
 * 
 * This example demonstrates how to extend the FDO application's UI by adding quick action
 * shortcuts and side panel menu items using mixins. These UI extensions make your plugin
 * more discoverable and accessible to users.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Use QuickActionMixin to add quick action shortcuts
 * - Use SidePanelMixin to add side panel menu items
 * - Route messages from UI extensions to plugin handlers
 * - Configure icons and labels for UI extensions
 * - Handle errors in UI extension operations
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Add quick actions to the application's quick action menu
 * 2. Add a side panel with multiple menu items
 * 3. Route quick action and side panel selections to appropriate handlers
 * 4. Display different content based on which UI extension was triggered
 * 5. Log all UI extension interactions
 */

import { 
  FDO_SDK, 
  FDOInterface, 
  PluginMetadata, 
  PluginRegistry,
  QuickActionMixin,
  SidePanelMixin,
  QuickAction,
  SidePanelConfig
} from "@anikitenko/fdo-sdk";

/**
 * UIExtensionsPlugin demonstrates UI extension capabilities.
 * 
 * Key concepts:
 * - Mixins: Add functionality to plugin classes
 * - QuickActionMixin: Adds defineQuickActions() method
 * - SidePanelMixin: Adds defineSidePanel() method
 * - Message routing: UI extensions trigger message handlers
 * 
 * COMMON PITFALL: Mixins must be applied using the mixin pattern.
 * This example shows the correct way to apply multiple mixins.
 */

const UIExtensionsPluginBase = SidePanelMixin(QuickActionMixin(FDO_SDK));

export default class UIExtensionsPlugin extends UIExtensionsPluginBase implements FDOInterface {
  /**
   * Plugin metadata.
   * 
   * CUSTOMIZE HERE: Replace with your plugin information
   */
  private readonly _metadata: PluginMetadata = {
    name: "UI Extensions Plugin Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates quick actions and side panel integration using mixins",
    icon: "icon.png"
  };

  /**
   * Current view state.
   * Used to track which UI extension was triggered.
   */
  private currentView: string = "default";

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize the plugin and register message handlers.
   * 
   * COMMON PITFALL: Register handlers for all message types used in UI extensions.
   * If a handler is missing, clicking the UI extension will result in an error.
   */
  init(): void {
    try {
      this.log("UIExtensionsPlugin initialized!");

      PluginRegistry.registerHandler("quickSearch", (data: any) => {
        return this.handleQuickSearch(data);
      });

      PluginRegistry.registerHandler("quickCreate", (data: any) => {
        return this.handleQuickCreate(data);
      });

      PluginRegistry.registerHandler("quickSettings", (data: any) => {
        return this.handleQuickSettings(data);
      });

      PluginRegistry.registerHandler("showDashboard", (data: any) => {
        return this.handleShowDashboard(data);
      });

      PluginRegistry.registerHandler("showReports", (data: any) => {
        return this.handleShowReports(data);
      });

      PluginRegistry.registerHandler("showSettings", (data: any) => {
        return this.handleShowSettings(data);
      });

      
    } catch (error) {
      this.error(error as Error);
    }
  }

  /**
   * Define quick actions for the plugin.
   * 
   * Quick actions appear in the FDO application's quick action menu and provide
   * shortcuts to common plugin functionality.
   * 
   * CUSTOMIZE HERE: Define your own quick actions
   * 
   * @returns Array of QuickAction objects
   */
  defineQuickActions(): QuickAction[] {
    try {
      return [
        {
          name: "Search Plugin Data",
          message_type: "quickSearch",
          subtitle: "Search through plugin data",
          icon: "search.png"
        },
        {
          name: "Create New Item",
          message_type: "quickCreate",
          subtitle: "Create a new item in the plugin",
          icon: "create.png"
        },
        {
          name: "Plugin Settings",
          message_type: "quickSettings",
          icon: "settings.png"
        }
      ];
    } catch (error) {
      this.error(error as Error);
      return [];
    }
  }

  /**
   * Define side panel configuration for the plugin.
   * 
   * The side panel provides a persistent menu in the FDO application's UI
   * for accessing plugin features.
   * 
   * CUSTOMIZE HERE: Define your own side panel structure
   * 
   * @returns SidePanelConfig object
   */
  defineSidePanel(): SidePanelConfig {
    try {
      return {
        icon: "panel.png",
        label: "UI Extensions",
        submenu_list: [
          {
            id: "dashboard",
            name: "Dashboard",
            message_type: "showDashboard"
          },
          {
            id: "reports",
            name: "Reports",
            message_type: "showReports"
          },
          {
            id: "settings",
            name: "Settings",
            message_type: "showSettings"
          }
        ]
      };
    } catch (error) {
      this.error(error as Error);
      return {
        icon: "panel.png",
        label: "UI Extensions",
        submenu_list: []
      };
    }
  }

  /**
   * Handle quick search action.
   * 
   * @param data - Data from the quick action
   * @returns Result object
   */
  private handleQuickSearch(data: any): any {
    try {
      this.currentView = "search";
      this.log("Quick search triggered");
      
      return {
        success: true,
        view: "search",
        message: "Search view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to activate search"
      };
    }
  }

  /**
   * Handle quick create action.
   * 
   * @param data - Data from the quick action
   * @returns Result object
   */
  private handleQuickCreate(data: any): any {
    try {
      this.currentView = "create";
      this.log("Quick create triggered");
      
      return {
        success: true,
        view: "create",
        message: "Create view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to activate create"
      };
    }
  }

  /**
   * Handle quick settings action.
   * 
   * @param data - Data from the quick action
   * @returns Result object
   */
  private handleQuickSettings(data: any): any {
    try {
      this.currentView = "settings";
      this.log("Quick settings triggered");
      
      return {
        success: true,
        view: "settings",
        message: "Settings view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to activate settings"
      };
    }
  }

  /**
   * Handle show dashboard from side panel.
   * 
   * @param data - Data from the side panel
   * @returns Result object
   */
  private handleShowDashboard(data: any): any {
    try {
      this.currentView = "dashboard";
      this.log("Dashboard view triggered from side panel");
      
      return {
        success: true,
        view: "dashboard",
        message: "Dashboard view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to show dashboard"
      };
    }
  }

  /**
   * Handle show reports from side panel.
   * 
   * @param data - Data from the side panel
   * @returns Result object
   */
  private handleShowReports(data: any): any {
    try {
      this.currentView = "reports";
      this.log("Reports view triggered from side panel");
      
      return {
        success: true,
        view: "reports",
        message: "Reports view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to show reports"
      };
    }
  }

  /**
   * Handle show settings from side panel.
   * 
   * @param data - Data from the side panel
   * @returns Result object
   */
  private handleShowSettings(data: any): any {
    try {
      this.currentView = "settings";
      this.log("Settings view triggered from side panel");
      
      return {
        success: true,
        view: "settings",
        message: "Settings view activated"
      };
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to show settings"
      };
    }
  }

  /**
   * Render the UI based on current view.
   * 
   * CUSTOMIZE HERE: Replace with your own view rendering logic
   * 
   * @returns HTML string
   */
  render(): string {
    try {
      let contentHtml = "";

      switch (this.currentView) {
        case "search":
          contentHtml = this.renderSearchView();
          break;
        case "create":
          contentHtml = this.renderCreateView();
          break;
        case "dashboard":
          contentHtml = this.renderDashboardView();
          break;
        case "reports":
          contentHtml = this.renderReportsView();
          break;
        case "settings":
          contentHtml = this.renderSettingsView();
          break;
        default:
          contentHtml = this.renderDefaultView();
      }

      const html = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1>${this._metadata.name}</h1>
          <p>${this._metadata.description}</p>
          
          ${contentHtml}
          
          <!-- UI Extensions Info -->
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <h3>UI Extensions</h3>
            <p><strong>Quick Actions:</strong> Access quick actions from the FDO application's quick action menu</p>
            <ul>
              <li>Search Plugin Data</li>
              <li>Create New Item</li>
              <li>Plugin Settings</li>
            </ul>
            
            <p style="margin-top: 15px;"><strong>Side Panel:</strong> Access features from the side panel menu</p>
            <ul>
              <li>Dashboard</li>
              <li>Reports</li>
              <li>Settings</li>
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

  /**
   * Render the default view.
   */
  private renderDefaultView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px;">
        <h3>Welcome to UI Extensions Example</h3>
        <p>This plugin demonstrates quick actions and side panel integration.</p>
        <p>Try the following:</p>
        <ul>
          <li>Use the quick action menu to trigger quick actions</li>
          <li>Use the side panel to navigate between views</li>
          <li>See how different views are rendered based on UI extension triggers</li>
        </ul>
      </div>
    `;
  }

  /**
   * Render the search view.
   */
  private renderSearchView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
        <h3>Search View</h3>
        <p>This view was triggered by the "Search Plugin Data" quick action.</p>
        <input 
          type="text" 
          placeholder="Search..." 
          style="padding: 10px; width: 400px; margin-top: 10px;"
        />
        <button style="padding: 10px 20px; margin-left: 10px; cursor: pointer;">Search</button>
      </div>
    `;
  }

  /**
   * Render the create view.
   */
  private renderCreateView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #d4edda; border-radius: 5px;">
        <h3>Create View</h3>
        <p>This view was triggered by the "Create New Item" quick action.</p>
        <form style="margin-top: 10px;">
          <input 
            type="text" 
            placeholder="Item name" 
            style="padding: 10px; width: 400px; display: block; margin-bottom: 10px;"
          />
          <textarea 
            placeholder="Description" 
            style="padding: 10px; width: 400px; height: 100px; display: block; margin-bottom: 10px;"
          ></textarea>
          <button type="submit" style="padding: 10px 20px; cursor: pointer;">Create</button>
        </form>
      </div>
    `;
  }

  /**
   * Render the dashboard view.
   */
  private renderDashboardView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #cfe2ff; border-radius: 5px;">
        <h3>Dashboard View</h3>
        <p>This view was triggered from the side panel "Dashboard" menu item.</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
          <div style="padding: 15px; background-color: white; border-radius: 5px;">
            <h4>Metric 1</h4>
            <p style="font-size: 24px; font-weight: bold;">42</p>
          </div>
          <div style="padding: 15px; background-color: white; border-radius: 5px;">
            <h4>Metric 2</h4>
            <p style="font-size: 24px; font-weight: bold;">87%</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the reports view.
   */
  private renderReportsView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #f8d7da; border-radius: 5px;">
        <h3>Reports View</h3>
        <p>This view was triggered from the side panel "Reports" menu item.</p>
        <ul style="margin-top: 10px;">
          <li>Monthly Report - <a href="#" style="color: #007bff;">View</a></li>
          <li>Quarterly Report - <a href="#" style="color: #007bff;">View</a></li>
          <li>Annual Report - <a href="#" style="color: #007bff;">View</a></li>
        </ul>
      </div>
    `;
  }

  /**
   * Render the settings view.
   */
  private renderSettingsView(): string {
    return `
      <div style="margin-top: 20px; padding: 15px; background-color: #e2e3e5; border-radius: 5px;">
        <h3>Settings View</h3>
        <p>This view can be triggered from either the quick action or side panel.</p>
        <form style="margin-top: 10px;">
          <label style="display: block; margin-bottom: 10px;">
            <input type="checkbox" checked /> Enable notifications
          </label>
          <label style="display: block; margin-bottom: 10px;">
            <input type="checkbox" /> Auto-save
          </label>
          <label style="display: block; margin-bottom: 10px;">
            Theme: 
            <select style="margin-left: 10px; padding: 5px;">
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </label>
          <button type="submit" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">Save Settings</button>
        </form>
      </div>
    `;
  }
}

/**
 * Key Takeaways:
 * 
 * 1. Use QuickActionMixin to add quick action shortcuts to the FDO application
 * 2. Use SidePanelMixin to add side panel menu items
 * 3. Apply mixins using the mixin pattern: SidePanelMixin(QuickActionMixin(FDO_SDK))
 * 4. Define quick actions in defineQuickActions() method
 * 5. Define side panel structure in defineSidePanel() method
 * 6. Register handlers for all message types used in UI extensions
 * 7. Always handle errors in defineQuickActions() and defineSidePanel()
 * 
 * Common Pitfalls to Avoid:
 * - Don't forget to register handlers for all UI extension message types
 * - Don't throw errors in defineQuickActions() or defineSidePanel()
 * - Don't forget to apply mixins to the base class
 * - Don't use the same message_type for different actions without proper routing
 * 
 * Next Steps:
 * - See example 05 for advanced DOM generation with styling
 * - Combine UI extensions with storage (example 03) for stateful plugins
 * - Use interactive handlers (example 02) with UI extensions for dynamic behavior
 */

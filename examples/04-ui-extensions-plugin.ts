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
  SidePanelConfig,
  DOMText,
  DOMNested,
  DOMButton,
  DOMInput,
  DOMLink
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
      const domText = new DOMText();
      const domNested = new DOMNested();

      // Main container
      const mainContent = domNested.createBlockDiv([
        domText.createHText(1, this._metadata.name),
        domText.createPText(this._metadata.description),

        // Dynamic content based on current view
        this.renderCurrentView(),

        // UI Extensions Info
        domNested.createBlockDiv([
          domText.createHText(3, "UI Extensions"),
          domText.createPText([
            domText.createStrongText("Quick Actions:"),
            " Access quick actions from the FDO application's quick action menu"
          ].join('')),
          domNested.createList([
            "Search Plugin Data",
            "Create New Item",
            "Plugin Settings"
          ]),

          domText.createPText([
            domText.createStrongText("Side Panel:"),
            " Access features from the side panel menu"
          ].join(''), { style: { marginTop: '15px' } }),
          domNested.createList([
            "Dashboard",
            "Reports",
            "Settings"
          ])
        ], {
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fff3cd',
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
      const errorDomText = new DOMText();
      const errorDomNested = new DOMNested();
      return errorDomNested.createBlockDiv([
        errorDomText.createHText(2, "Error rendering plugin"),
        errorDomText.createPText("An error occurred while rendering the plugin UI. Check the console for details.")
      ], {
        style: {
          padding: '20px',
          color: 'red'
        }
      });
    }
  }

  /**
   * Render the current view based on the view state
   */
  private renderCurrentView(): string {
    switch (this.currentView) {
      case "search":
        return this.renderSearchView();
      case "create":
        return this.renderCreateView();
      case "dashboard":
        return this.renderDashboardView();
      case "reports":
        return this.renderReportsView();
      case "settings":
        return this.renderSettingsView();
      default:
        return this.renderDefaultView();
    }
  }

  /**
   * Render the default view.
   */
  private renderDefaultView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();

    return domNested.createBlockDiv([
      domText.createHText(3, "Welcome to UI Extensions Example"),
      domText.createPText("This plugin demonstrates quick actions and side panel integration."),
      domText.createPText("Try the following:"),
      domNested.createList([
        "Use the quick action menu to trigger quick actions",
        "Use the side panel to navigate between views",
        "See how different views are rendered based on UI extension triggers"
      ])
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        borderRadius: '5px'
      }
    });
  }

  /**
   * Render the search view.
   */
  private renderSearchView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();
    const domInput = new DOMInput("search", {
      style: {
        padding: '10px',
        width: '400px',
        marginTop: '10px'
      }
    });
    const domButton = new DOMButton();

    return domNested.createBlockDiv([
      domText.createHText(3, "Search View"),
      domText.createPText("This view was triggered by the \"Search Plugin Data\" quick action."),
      domNested.createBlockDiv([
        domInput.createInput("text"),
        domButton.createButton("Search", () => {}, {
          style: {
            padding: '10px 20px',
            marginLeft: '10px',
            cursor: 'pointer'
          }
        })
      ], {
        style: {
          display: 'flex',
          alignItems: 'center'
        }
      })
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e8f4f8',
        borderRadius: '5px'
      }
    });
  }

  /**
   * Render the create view.
   */
  private renderCreateView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();
    const domInput = new DOMInput("create", {
      style: {
        padding: '10px',
        width: '400px',
        marginBottom: '10px'
      }
    });
    const domButton = new DOMButton();

    return domNested.createBlockDiv([
      domText.createHText(3, "Create View"),
      domText.createPText("This view was triggered by the \"Create New Item\" quick action."),
      domNested.createForm([
        domNested.createBlockDiv([
          domInput.createInput("text")
        ], {
          style: {
            marginBottom: '10px'
          }
        }),
        domNested.createBlockDiv([
          domInput.createTextarea()
        ], {
          style: {
            marginBottom: '10px'
          }
        }),
        domButton.createButton("Create", () => {}, {
          style: {
            padding: '10px 20px',
            cursor: 'pointer'
          }
        })
      ], {
        style: { marginTop: '10px' }
      })
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#d4edda',
        borderRadius: '5px'
      }
    });
  }

  /**
   * Render the dashboard view.
   */
  private renderDashboardView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();

    const createMetricBlock = (title: string, value: string) => {
      return domNested.createBlockDiv([
        domText.createHText(4, title),
        domText.createPText(value, {
          style: {
            fontSize: '24px',
            fontWeight: 'bold'
          }
        })
      ], {
        style: {
          padding: '15px',
          backgroundColor: 'white',
          borderRadius: '5px'
        }
      });
    };

    return domNested.createBlockDiv([
      domText.createHText(3, "Dashboard View"),
      domText.createPText("This view was triggered from the side panel \"Dashboard\" menu item."),
      domNested.createBlockDiv([
        createMetricBlock("Metric 1", "42"),
        createMetricBlock("Metric 2", "87%")
      ], {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginTop: '15px'
        }
      })
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#cfe2ff',
        borderRadius: '5px'
      }
    });
  }

  /**
   * Render the reports view.
   */
  private renderReportsView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();
    const domLink = new DOMLink("reports", {
      style: { color: '#007bff' }
    });

    const createReportItem = (title: string) => {
      return domNested.createBlockDiv([
        domText.createText(`${title} - `),
        domText.createText(domLink.createLink("#", "View"))
      ]);
    };

    return domNested.createBlockDiv([
      domText.createHText(3, "Reports View"),
      domText.createPText("This view was triggered from the side panel \"Reports\" menu item."),
      domNested.createList([
        createReportItem("Monthly Report"),
        createReportItem("Quarterly Report"),
        createReportItem("Annual Report")
      ], {
        style: { marginTop: '10px' }
      })
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8d7da',
        borderRadius: '5px'
      }
    });
  }

  /**
   * Render the settings view.
   */
  private renderSettingsView(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();
    const domInput = new DOMInput("settings", {});
    const domButton = new DOMButton();

    const createCheckboxOption = (label: string, checked: boolean = false) => {
      return domNested.createBlockDiv([
        domText.createLabelText(label, "settings-" + label.toLowerCase().replace(/\s+/g, '-'), {
          style: { display: 'block', marginBottom: '10px' }
        }),
        domInput.createInput(checked ? "checkbox" : "checkbox")
      ]);
    };

    return domNested.createBlockDiv([
      domText.createHText(3, "Settings View"),
      domText.createPText("This view can be triggered from either the quick action or side panel."),
      domNested.createForm([
        createCheckboxOption("Enable notifications", true),
        createCheckboxOption("Auto-save"),
        
        domNested.createBlockDiv([
          domText.createLabelText("Theme:", "settings-theme", {
            style: { marginRight: '10px' }
          }),
          domInput.createSelect([
            "Light",
            "Dark",
            "Auto"
          ])
        ], {
          style: { marginBottom: '10px' }
        }),
        
        domButton.createButton("Save Settings", () => {}, {
          style: {
            padding: '10px 20px',
            marginTop: '10px',
            cursor: 'pointer'
          }
        })
      ], {
        style: { marginTop: '10px' }
      })
    ], {
      style: {
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e2e3e5',
        borderRadius: '5px'
      }
    });
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

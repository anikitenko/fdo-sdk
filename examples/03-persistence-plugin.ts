/**
 * Example 3: Data Persistence Plugin
 * 
 * This example demonstrates how to save and retrieve user data across application sessions
 * using the FDO SDK storage system. It covers both in-memory (StoreDefault) and file-based
 * (StoreJson) storage backends.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Use StoreDefault for temporary data (in-memory)
 * - Use StoreJson for persistent data (file-based)
 * - Implement proper key naming conventions
 * - Handle storage errors gracefully
 * - Save and retrieve different data types
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display saved user preferences (name, theme, notifications)
 * 2. Provide forms to update preferences
 * 3. Show temporary session data (visit count, last action)
 * 4. Persist preference changes across application restarts
 * 5. Clear temporary data on each session
 */

import { FDO_SDK, FDOInterface, PluginMetadata, PluginRegistry, DOMText, DOMNested, DOMButton, DOMInput } from "@anikitenko/fdo-sdk";

declare global {
  interface Window {
    fdoSDK: {
      sendMessage: (handler: string, data: any) => Promise<any>;
    };
  }
}

/**
 * PersistencePlugin demonstrates data storage and retrieval.
 * 
 * Key concepts:
 * - StoreDefault: In-memory storage (data lost on restart)
 * - StoreJson: File-based storage (data persists across restarts)
 * - Key naming: Use namespaced keys to avoid conflicts
 * - Error handling: Storage operations can fail
 */
export default class PersistencePlugin extends FDO_SDK implements FDOInterface {
  /**
   * Plugin metadata.
   * 
   * CUSTOMIZE HERE: Replace with your plugin information
   */
  private readonly _metadata: PluginMetadata = {
    name: "Persistence Plugin Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates data persistence with StoreDefault and StoreJson",
    icon: "icon.png"
  };

  /**
   * Storage instances.
   * StoreDefault is automatically available without registration.
   * StoreJson must be registered before use.
   */
  private tempStore: any; // StoreDefault for temporary data
  private persistentStore: any; // StoreJson for persistent data

  /**
   * Key naming convention.
   * Use namespaced keys to avoid conflicts with other plugins.
   * Format: "pluginName:category:keyName"
   * 
   * COMMON PITFALL: Always namespace your keys to prevent conflicts.
   * Without namespacing, multiple plugins might overwrite each other's data.
   */
  private readonly KEYS = {
    USER_NAME: "persistencePlugin:prefs:userName",
    USER_THEME: "persistencePlugin:prefs:theme",
    NOTIFICATIONS_ENABLED: "persistencePlugin:prefs:notifications",
    
    VISIT_COUNT: "persistencePlugin:session:visitCount",
    LAST_ACTION: "persistencePlugin:session:lastAction",
    SESSION_START: "persistencePlugin:session:startTime"
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize the plugin and set up storage.
   * 
   * COMMON PITFALL: Always initialize storage in init(), not in render().
   * Storage operations in render() can cause performance issues and data inconsistencies.
   */
  init(): void {
    try {
      this.log("PersistencePlugin initialized!");

      this.tempStore = PluginRegistry.useStore("default");

      try {
        this.persistentStore = PluginRegistry.useStore("json");
      } catch (error) {
        this.log("StoreJson not available, using StoreDefault for all storage");
        this.persistentStore = this.tempStore;
      }

      this.initializeSessionData();

      PluginRegistry.registerHandler("savePreferences", (data: any) => {
        return this.handleSavePreferences(data);
      });

      PluginRegistry.registerHandler("clearPreferences", (data: any) => {
        return this.handleClearPreferences(data);
      });

      PluginRegistry.registerHandler("recordAction", (data: any) => {
        return this.handleRecordAction(data);
      });

      
    } catch (error) {
      this.error(error as Error);
    }
  }

  /**
   * Initialize session data in temporary storage.
   * This data is cleared on each application restart.
   */
  private initializeSessionData(): void {
    try {
      const visitCount = this.tempStore.get(this.KEYS.VISIT_COUNT) || 0;
      this.tempStore.set(this.KEYS.VISIT_COUNT, visitCount + 1);

      this.tempStore.set(this.KEYS.SESSION_START, new Date().toISOString());

      this.log(`Session initialized. Visit count: ${visitCount + 1}`);
      
    } catch (error) {
      this.error(error as Error);
    }
  }

  /**
   * Handle saving user preferences to persistent storage.
   * 
   * @param data - Preference data from the UI
   * @returns Result object
   */
  private handleSavePreferences(data: any): any {
    try {
      if (!data) {
        return {
          success: false,
          error: "No data provided"
        };
      }

      if (data.userName !== undefined) {
        this.persistentStore.set(this.KEYS.USER_NAME, data.userName);
      }

      if (data.theme !== undefined) {
        this.persistentStore.set(this.KEYS.USER_THEME, data.theme);
      }

      if (data.notificationsEnabled !== undefined) {
        this.persistentStore.set(this.KEYS.NOTIFICATIONS_ENABLED, data.notificationsEnabled);
      }

      this.log("Preferences saved successfully");

      return {
        success: true,
        message: "Preferences saved successfully",
        savedData: data
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to save preferences"
      };
    }
  }

  /**
   * Handle clearing all preferences.
   * 
   * @param data - Optional data
   * @returns Result object
   */
  private handleClearPreferences(data: any): any {
    try {
      this.persistentStore.remove(this.KEYS.USER_NAME);
      this.persistentStore.remove(this.KEYS.USER_THEME);
      this.persistentStore.remove(this.KEYS.NOTIFICATIONS_ENABLED);

      this.log("Preferences cleared");

      return {
        success: true,
        message: "All preferences have been cleared"
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to clear preferences"
      };
    }
  }

  /**
   * Handle recording a user action to temporary storage.
   * 
   * @param data - Action data
   * @returns Result object
   */
  private handleRecordAction(data: any): any {
    try {
      const action = data.action || "unknown";
      const timestamp = new Date().toISOString();

      this.tempStore.set(this.KEYS.LAST_ACTION, {
        action,
        timestamp
      });

      this.log(`Action recorded: ${action}`);

      return {
        success: true,
        action,
        timestamp
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to record action"
      };
    }
  }

  /**
   * Render the persistence UI.
   * 
   * CUSTOMIZE HERE: Replace with your own storage UI
   * 
   * @returns HTML string
   */
  render(): string {
    try {
      const userName = this.persistentStore.get(this.KEYS.USER_NAME) || "Not set";
      const theme = this.persistentStore.get(this.KEYS.USER_THEME) || "light";
      const notificationsEnabled = this.persistentStore.get(this.KEYS.NOTIFICATIONS_ENABLED) ?? true;

      const visitCount = this.tempStore.get(this.KEYS.VISIT_COUNT) || 0;
      const lastAction = this.tempStore.get(this.KEYS.LAST_ACTION);
      const sessionStart = this.tempStore.get(this.KEYS.SESSION_START);

      const domText = new DOMText();
      const domNested = new DOMNested();
      const domButton = new DOMButton();
      const domInput = new DOMInput("", {});

      // Create main container
      const mainContent = domNested.createBlockDiv([
        // Header section
        domText.createHText(1, this._metadata.name),
        domText.createPText(this._metadata.description),
        
        // Persistent Data Section
        domNested.createBlockDiv([
          domText.createHText(3, "Persistent Preferences (StoreJson)"),
          domText.createPText("These preferences are saved to a file and persist across application restarts.", {
            style: {
              fontSize: '12px',
              color: '#666',
              marginBottom: '15px'
            }
          }),
          
          // Current values display
          domNested.createBlockDiv([
            domText.createPText([
              domText.createStrongText("User Name:"),
              ` ${userName}`
            ].join(''), { style: { marginBottom: '10px' } }),
            
            domText.createPText([
              domText.createStrongText("Theme:"),
              ` ${theme}`
            ].join(''), { style: { marginBottom: '10px' } }),
            
            domText.createPText([
              domText.createStrongText("Notifications:"),
              ` ${notificationsEnabled ? "Enabled" : "Disabled"}`
            ].join(''), { style: { marginBottom: '10px' } })
          ]),
          
          // Preferences form
          domNested.createForm([
            // Username input
            domNested.createBlockDiv([
              domText.createLabelText("User Name:", "userName", {
                style: { display: 'block', marginBottom: '5px' }
              }),
              new DOMInput("userName", {
                style: { padding: '8px', width: '300px' }
              }).createInput("text")
            ], { style: { marginBottom: '10px' } }),
            
            // Theme select
            domNested.createBlockDiv([
              domText.createLabelText("Theme:", "theme", {
                style: { display: 'block', marginBottom: '5px' }
              }),
              new DOMInput("theme", {
                style: { padding: '8px', width: '316px' }
              }).createSelect([
                domInput.createOption("Light", "light", theme === 'light'),
                domInput.createOption("Dark", "dark", theme === 'dark'),
                domInput.createOption("Auto", "auto", theme === 'auto')
              ])
            ], { style: { marginBottom: '10px' } }),
            
            // Notifications checkbox
            domNested.createBlockDiv([
              domText.createLabelText([
                new DOMInput("notifications", {}).createInput("checkbox"),
                " Enable Notifications"
              ].join(''), "notifications")
            ], { style: { marginBottom: '15px' } }),
            
            // Form buttons
            domNested.createBlockDiv([
              domButton.createButton("Save Preferences", 
                () => {
                  const form = document.querySelector('form');
                  if (form) form.dispatchEvent(new Event('submit'));
                },
                {
                  style: {
                    padding: '10px 20px',
                    marginRight: '10px',
                    cursor: 'pointer',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }
                }
              ),
              
              domButton.createButton("Clear All",
                () => window.fdoSDK.sendMessage('clearPreferences', {}),
                {
                  style: {
                    padding: '10px 20px',
                    cursor: 'pointer',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }
                }
              )
            ])
          ], {
            customAttributes: {
              onsubmit: 'event.preventDefault(); savePreferences();'
            },
            style: { marginTop: '15px' }
          }),
          
          // Result area
          domNested.createBlockDiv([], {
            customAttributes: { id: 'prefs-result' },
            style: { marginTop: '10px' }
          })
        ], {
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e8f4f8',
            borderRadius: '5px'
          }
        }),
        
        // Temporary Data Section
        domNested.createBlockDiv([
          domText.createHText(3, "Session Data (StoreDefault)"),
          domText.createPText("This data is stored in memory and cleared when the application restarts.", {
            style: {
              fontSize: '12px',
              color: '#666',
              marginBottom: '15px'
            }
          }),
          
          domNested.createBlockDiv([
            domText.createPText([
              domText.createStrongText("Visit Count:"),
              ` ${visitCount}`
            ].join(''), { style: { marginBottom: '10px' } }),
            
            domText.createPText([
              domText.createStrongText("Session Started:"),
              ` ${sessionStart ? new Date(sessionStart).toLocaleString() : 'N/A'}`
            ].join(''), { style: { marginBottom: '10px' } }),
            
            domText.createPText([
              domText.createStrongText("Last Action:"),
              ` ${lastAction ? `${lastAction.action} at ${new Date(lastAction.timestamp).toLocaleTimeString()}` : 'None'}`
            ].join(''), { style: { marginBottom: '15px' } })
          ]),
          
          domButton.createButton("Record Action",
            () => window.fdoSDK.sendMessage('recordAction', { action: 'Button Click' }),
            {
              style: {
                padding: '10px 20px',
                cursor: 'pointer'
              }
            }
          )
        ], {
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '5px'
          }
        }),
        
        // Key Concepts Section
        domNested.createBlockDiv([
          domText.createHText(3, "Storage Concepts"),
          domNested.createList([
            domNested.createListItem([
              domText.createStrongText("StoreDefault:"),
              " In-memory storage, data cleared on restart"
            ]),
            domNested.createListItem([
              domText.createStrongText("StoreJson:"),
              " File-based storage, data persists across restarts"
            ]),
            domNested.createListItem([
              domText.createStrongText("Key Naming:"),
              " Use namespaced keys (pluginName:category:key)"
            ]),
            domNested.createListItem([
              domText.createStrongText("Error Handling:"),
              " Always wrap storage operations in try-catch"
            ]),
            domNested.createListItem([
              domText.createStrongText("Data Types:"),
              " Stores support strings, numbers, booleans, objects, arrays"
            ])
          ])
        ], {
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            borderRadius: '5px'
          }
        }),
        
        // JavaScript for handling preferences
        domText.createText(`
          <script>
            async function savePreferences() {
              const userName = document.getElementById('userName').value;
              const theme = document.getElementById('theme').value;
              const notificationsEnabled = document.getElementById('notifications').checked;
              const resultDiv = document.getElementById('prefs-result');
              
              resultDiv.innerHTML = ${JSON.stringify(
                domText.createPText("Saving...", { style: { color: '#666' } })
              )};
              
              try {
                const result = await window.fdoSDK.sendMessage('savePreferences', {
                  userName,
                  theme,
                  notificationsEnabled
                });
                
                if (result.success) {
                  resultDiv.innerHTML = ${JSON.stringify(
                    domText.createPText("${result.message}", { style: { color: 'green' } })
                  )};
                  setTimeout(() => location.reload(), 1000);
                } else {
                  resultDiv.innerHTML = ${JSON.stringify(
                    domText.createPText("Error: ${result.error}", { style: { color: 'red' } })
                  )};
                }
              } catch (error) {
                resultDiv.innerHTML = ${JSON.stringify(
                  domText.createPText("An error occurred. Check the console.", { style: { color: 'red' } })
                )};
                console.error('Save error:', error);
              }
            }
          </script>
        `)
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
 * 1. Use StoreDefault for temporary data (in-memory, cleared on restart)
 * 2. Use StoreJson for persistent data (file-based, survives restarts)
 * 3. Always namespace your keys to avoid conflicts (pluginName:category:key)
 * 4. Wrap all storage operations in try-catch blocks
 * 5. Initialize storage in init(), not in render()
 * 6. Storage supports all JSON-serializable types (strings, numbers, objects, arrays)
 * 
 * Common Pitfalls to Avoid:
 * - Don't use generic key names - always namespace them
 * - Don't forget error handling for storage operations
 * - Don't perform storage operations in render() - do it in handlers
 * - Don't assume StoreJson is always available - have a fallback
 * 
 * Next Steps:
 * - See example 04 for UI extensions (quick actions and side panels)
 * - See example 05 for advanced DOM generation with styling
 */

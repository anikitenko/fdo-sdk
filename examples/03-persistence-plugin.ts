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
 * - Initialize storage safely in `init()`
 * - Handle storage errors and StoreJson unavailability gracefully
 * - Trigger persistence handlers from iframe UI via `UI_MESSAGE`
 * - Save and retrieve different data types with namespaced keys
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display saved user preferences (name, theme, notifications)
 * 2. Provide UI controls to update preferences through backend handlers
 * 3. Show temporary session data (visit count, last action)
 * 4. Persist preference changes across application restarts when JSON storage is available
 * 5. Clear and record session data through explicit UI actions
 */

import { FDO_SDK, FDOInterface, PluginCapability, PluginMetadata, PluginRegistry } from "@anikitenko/fdo-sdk";

declare global {
  interface Window {
    createBackendReq: (type: string, data?: any) => Promise<any>;
    callHandler: (handler: string, content?: unknown) => Promise<any>;
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
    icon: "database"
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

  declareCapabilities(): PluginCapability[] {
    return ["storage", "storage.json"];
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

      PluginRegistry.registerHandler("clearPreferences", (_data: unknown) => {
        return this.handleClearPreferences();
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
  private handleClearPreferences(): any {
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

      return `
        <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
          <h1>${this._metadata.name}</h1>
          <p>${this._metadata.description}</p>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#e8f4f8", borderRadius: "5px" }}>
            <h3>Persistent Preferences (StoreJson)</h3>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              These preferences are saved to a file and persist across application restarts.
            </p>

            <div>
              <p style={{ marginBottom: "10px" }}><strong>User Name:</strong> <span id="current-user-name">${userName}</span></p>
              <p style={{ marginBottom: "10px" }}><strong>Theme:</strong> <span id="current-theme">${theme}</span></p>
              <p style={{ marginBottom: "10px" }}><strong>Notifications:</strong> <span id="current-notifications">${notificationsEnabled ? "Enabled" : "Disabled"}</span></p>
            </div>

            <div id="preferences-form" style={{ marginTop: "15px" }}>
              <div style={{ marginBottom: "10px" }}>
                <label htmlFor="userName" style={{ display: "block", marginBottom: "5px" }}>User Name:</label>
                <input id="userName" type="text" defaultValue="${userName === "Not set" ? "" : userName}" style={{ padding: "8px", width: "300px" }} />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label htmlFor="theme" style={{ display: "block", marginBottom: "5px" }}>Theme:</label>
                <select id="theme" defaultValue="${theme}" style={{ padding: "8px", width: "316px" }}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label htmlFor="notifications">
                  <input id="notifications" type="checkbox" defaultChecked={${notificationsEnabled ? "true" : "false"}} /> Enable Notifications
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  id="save-preferences-btn"
                  type="button"
                  style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "3px"
                  }}
                >
                  Save Preferences
                </button>

                <button
                  id="clear-preferences-btn"
                  type="button"
                  style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "3px"
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div id="prefs-result" style={{ marginTop: "10px" }}></div>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
            <h3>Session Data (StoreDefault)</h3>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
              This data is stored in memory and cleared when the application restarts.
            </p>

            <div>
              <p style={{ marginBottom: "10px" }}><strong>Visit Count:</strong> <span id="current-visit-count">${visitCount}</span></p>
              <p style={{ marginBottom: "10px" }}><strong>Session Started:</strong> ${sessionStart ? new Date(sessionStart).toLocaleString() : "N/A"}</p>
              <p style={{ marginBottom: "15px" }}><strong>Last Action:</strong> <span id="current-last-action">${lastAction ? `${lastAction.action} at ${new Date(lastAction.timestamp).toLocaleTimeString()}` : "None"}</span></p>
            </div>

            <button id="record-action-btn" type="button" style={{ padding: "10px 20px", cursor: "pointer" }}>
              Record Action
            </button>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "5px" }}>
            <h3>Storage Concepts</h3>
            <ul>
              <li><strong>StoreDefault:</strong> in-memory storage, data cleared on restart</li>
              <li><strong>StoreJson:</strong> file-based storage, data persists across restarts</li>
              <li><strong>Key Naming:</strong> use namespaced keys (<code>pluginName:category:key</code>)</li>
              <li><strong>Error Handling:</strong> always wrap storage operations in try/catch</li>
              <li><strong>Data Types:</strong> stores support strings, numbers, booleans, objects, and arrays</li>
            </ul>
          </div>
        </div>
      `;
      
    } catch (error) {
      this.error(error as Error);
      return `
        <div style="padding: 20px; color: red;">
          <h2>Error rendering plugin</h2>
          <p>An error occurred while rendering the plugin UI. Check plugin logs for details.</p>
        </div>
      `;
    }
  }

  renderOnLoad(): string {
    return `
      () => {
        const callHandler = (handler, content = {}) =>
          window.createBackendReq("UI_MESSAGE", { handler, content });

        const saveBtn = document.getElementById("save-preferences-btn");
        const clearBtn = document.getElementById("clear-preferences-btn");
        const recordBtn = document.getElementById("record-action-btn");
        const resultDiv = document.getElementById("prefs-result");
        const currentUserName = document.getElementById("current-user-name");
        const currentTheme = document.getElementById("current-theme");
        const currentNotifications = document.getElementById("current-notifications");
        const currentVisitCount = document.getElementById("current-visit-count");
        const currentLastAction = document.getElementById("current-last-action");

        const setResult = (message, color = "#666") => {
          if (!resultDiv) return;
          resultDiv.textContent = message;
          resultDiv.style.color = color;
        };

        const savePreferences = async () => {
          const userNameInput = document.getElementById("userName");
          const themeInput = document.getElementById("theme");
          const notificationsInput = document.getElementById("notifications");
          if (!userNameInput || !themeInput || !notificationsInput) return;

          const userName = userNameInput.value;
          const theme = themeInput.value;
          const notificationsEnabled = notificationsInput.checked;

          setResult("Saving...");

          try {
            const result = await callHandler("savePreferences", {
              userName,
              theme,
              notificationsEnabled,
            });

            if (result?.success) {
              setResult(result.message || "Preferences saved successfully.", "green");
              if (currentUserName) {
                currentUserName.textContent = userName || "Not set";
              }
              if (currentTheme) {
                currentTheme.textContent = theme;
              }
              if (currentNotifications) {
                currentNotifications.textContent = notificationsEnabled ? "Enabled" : "Disabled";
              }
            } else {
              setResult(result?.error || "Failed to save preferences.", "red");
            }
          } catch (error) {
            setResult("An error occurred while saving preferences.", "red");
          }
        };

        saveBtn?.addEventListener("click", () => {
          void savePreferences();
        });

        clearBtn?.addEventListener("click", async () => {
          try {
            const result = await callHandler("clearPreferences", {});
            if (result?.success) {
              setResult(result.message || "Preferences cleared.", "green");
              const userNameInput = document.getElementById("userName");
              const themeInput = document.getElementById("theme");
              const notificationsInput = document.getElementById("notifications");
              if (currentUserName) {
                currentUserName.textContent = "Not set";
              }
              if (currentTheme) {
                currentTheme.textContent = "light";
              }
              if (currentNotifications) {
                currentNotifications.textContent = "Enabled";
              }
              if (userNameInput) {
                userNameInput.value = "";
              }
              if (themeInput) {
                themeInput.value = "light";
              }
              if (notificationsInput) {
                notificationsInput.checked = true;
              }
            } else {
              setResult(result?.error || "Failed to clear preferences.", "red");
            }
          } catch (error) {
            setResult("An error occurred while clearing preferences.", "red");
          }
        });

        recordBtn?.addEventListener("click", async () => {
          try {
            const result = await callHandler("recordAction", { action: "Button Click" });
            if (result?.success) {
              setResult("Action recorded.", "green");
              if (currentLastAction) {
                currentLastAction.textContent = result.timestamp
                  ? "Button Click at " + new Date(result.timestamp).toLocaleTimeString()
                  : "Button Click";
              }
              if (currentVisitCount) {
                const parsedCount = Number(currentVisitCount.textContent || "0");
                currentVisitCount.textContent = Number.isFinite(parsedCount) ? String(parsedCount) : currentVisitCount.textContent;
              }
            } else {
              setResult(result?.error || "Failed to record action.", "red");
            }
          } catch (error) {
            setResult("An error occurred while recording action.", "red");
          }
        });
      }
    `;
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

new PersistencePlugin();

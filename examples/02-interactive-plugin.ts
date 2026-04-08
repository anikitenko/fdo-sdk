/**
 * Example 2: Interactive Plugin with UI Actions
 * 
 * This example demonstrates how to create interactive functionality where users can
 * click buttons, fill forms, and trigger custom actions through the message-based
 * communication system.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Register and handle custom message handlers
 * - Keep backend handlers in `init()` and browser logic in `renderOnLoad()`
 * - Trigger backend handlers from iframe UI via `UI_MESSAGE`
 * - Process user input and reflect handler results in the UI
 * - Handle asynchronous operations
 * - Implement proper error handling for user interactions
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display a text input and action button for a simple form flow
 * 2. Show a counter with increment/decrement buttons
 * 3. Process button clicks through registered backend handlers
 * 4. Update the UI dynamically based on handler responses
 * 5. Log all user interactions through SDK handlers
 */

import { FDO_SDK, FDOInterface, PluginMetadata, PluginRegistry } from "@anikitenko/fdo-sdk";

declare global {
  interface Window {
    createBackendReq: (type: string, data?: any) => Promise<any>;
    callHandler: (handler: string, content?: unknown) => Promise<any>;
  }
}

/**
 * InteractivePlugin demonstrates user interaction handling.
 * 
 * Key concepts:
 * - Message handlers: Functions that respond to UI events
 * - Handler registration: Done in init() using PluginRegistry.registerHandler()
 * - Async patterns: Handlers can be async for long-running operations
 */
export default class InteractivePlugin extends FDO_SDK implements FDOInterface {
  /**
   * Plugin metadata.
   * 
   * CUSTOMIZE HERE: Replace with your plugin information
   */
  private readonly _metadata: PluginMetadata = {
    name: "Interactive Plugin Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates interactive UI with buttons, forms, and message handlers",
    icon: "widget-button"
  };

  /**
   * Internal state for the counter example.
   * In a real plugin, you might use the storage system (see example 03) for persistence.
   */
  private counter: number = 0;

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize the plugin and register message handlers.
   * 
   * Message handlers are functions that respond to UI events.
   * They are registered by name and can be triggered from UI elements.
   * 
   * COMMON PITFALL: Always register handlers in init(), not in render().
   * Handlers registered in render() will be re-registered every time the UI updates,
   * potentially causing duplicate handler registrations.
   */
  init(): void {
    try {
      this.log("InteractivePlugin initialized!");

      PluginRegistry.registerHandler("incrementCounter", (data: unknown) => {
        return this.handleIncrement(data);
      });

      PluginRegistry.registerHandler("decrementCounter", (data: unknown) => {
        return this.handleDecrement(data);
      });

      PluginRegistry.registerHandler("submitForm", async (data: unknown) => {
        return await this.handleFormSubmit(data);
      });


    } catch (error) {
      this.error(error as Error);
    }
  }

  /**
   * Handle increment button click.
   * 
   * @param data - Data passed from the UI (can include button context, user info, etc.)
   * @returns Result object that can be used to update the UI
   */
  private handleIncrement(_data: unknown): any {
    try {
      this.counter++;
      this.log(`Counter incremented to ${this.counter}`);
      
      return {
        success: true,
        counter: this.counter,
        message: `Counter is now ${this.counter}`
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to increment counter"
      };
    }
  }

  /**
   * Handle decrement button click.
   * 
   * @param data - Data passed from the UI
   * @returns Result object
   */
  private handleDecrement(_data: unknown): any {
    try {
      this.counter--;
      this.log(`Counter decremented to ${this.counter}`);
      
      return {
        success: true,
        counter: this.counter,
        message: `Counter is now ${this.counter}`
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to decrement counter"
      };
    }
  }

  /**
   * Handle form submission.
   * 
   * This demonstrates async handler patterns for operations that might take time
   * (e.g., API calls, file operations, complex computations).
   * 
   * COMMON PITFALL: For async operations, always use async/await or promises.
   * Don't block the UI with synchronous long-running operations.
   * 
   * @param data - Form data from the UI
   * @returns Promise resolving to result object
   */
  private async handleFormSubmit(data: unknown): Promise<any> {
    try {
      this.log(`Form submitted with data: ${JSON.stringify(data)}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userName =
        typeof data === "object" &&
        data !== null &&
        "userName" in data &&
        typeof (data as { userName?: unknown }).userName === "string"
          ? (data as { userName: string }).userName
          : "Guest";
      
      return {
        success: true,
        message: `Welcome, ${userName}! Your form has been processed.`,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.error(error as Error);
      return {
        success: false,
        error: "Failed to process form submission"
      };
    }
  }

  /**
   * Render the interactive UI.
   * 
   * This example shows how to create buttons and forms that trigger message handlers.
   * 
   * CUSTOMIZE HERE: Replace with your own interactive UI
   * 
   * @returns HTML string with interactive elements
   */
  render(): string {
    try {
      return `
        <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", lineHeight: "1.5" }}>
          <h1>${this._metadata.name}</h1>
          <p>${this._metadata.description}</p>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "5px" }}>
            <h3>Counter Example</h3>
            <p>Current count: <strong>${this.counter}</strong></p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button id="increment-counter-btn" style={{ padding: "10px 20px", cursor: "pointer" }}>Increment</button>
              <button id="decrement-counter-btn" style={{ padding: "10px 20px", cursor: "pointer" }}>Decrement</button>
            </div>
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
              Click the buttons to increment or decrement the counter. The counter value is maintained in plugin state.
            </p>
            <div id="counter-result" style={{ marginTop: "10px" }}></div>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#e8f4f8", borderRadius: "5px" }}>
            <h3>Form Example</h3>
            <div id="interactive-example-form">
              <label htmlFor="userName" style={{ display: "block", marginBottom: "5px" }}>Enter your name:</label>
              <input
                id="userName"
                type="text"
                style={{ padding: "8px", width: "300px", marginBottom: "10px" }}
              />
              <div>
                <button
                  id="submit-form-btn"
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
                  Submit
                </button>
              </div>
            </div>
            <div id="form-result" style={{ marginTop: "10px" }}></div>
            <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
              Enter your name and submit the form to see async handler processing.
            </p>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "5px" }}>
            <h3>Key Concepts</h3>
            <ul>
              <li><strong>Message Handlers:</strong> functions registered in <code>init()</code> that respond to UI events</li>
              <li><strong>Handler Registration:</strong> use <code>PluginRegistry.registerHandler(name, fn)</code></li>
              <li><strong>Async Patterns:</strong> handlers can be async for long-running operations</li>
              <li><strong>Error Handling:</strong> wrap handler logic in try/catch blocks</li>
              <li><strong>State Management:</strong> use class properties for temporary state and storage for persistence</li>
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

        const incrementBtn = document.getElementById("increment-counter-btn");
        const decrementBtn = document.getElementById("decrement-counter-btn");
        const counterResult = document.getElementById("counter-result");
        const formContainer = document.getElementById("interactive-example-form");
        const submitFormButton = document.getElementById("submit-form-btn");
        const formResult = document.getElementById("form-result");

        const setCounterResult = (text, color = "#666") => {
          if (!counterResult) return;
          counterResult.textContent = text;
          counterResult.style.color = color;
        };

        incrementBtn?.addEventListener('click', async () => {
          try {
            const result = await callHandler('incrementCounter', {});
            if (result?.success) {
              setCounterResult(result.message || ('Counter is now ' + result.counter), 'green');
            } else {
              setCounterResult(result?.error || 'Failed to increment counter', 'red');
            }
          } catch (error) {
            setCounterResult('An error occurred while incrementing counter.', 'red');
          }
        });

        decrementBtn?.addEventListener('click', async () => {
          try {
            const result = await callHandler('decrementCounter', {});
            if (result?.success) {
              setCounterResult(result.message || ('Counter is now ' + result.counter), 'green');
            } else {
              setCounterResult(result?.error || 'Failed to decrement counter', 'red');
            }
          } catch (error) {
            setCounterResult('An error occurred while decrementing counter.', 'red');
          }
        });

        const handleFormSubmit = async () => {
          const userNameInput = document.getElementById("userName");
          if (!formResult || !userNameInput) return;
          const userName = userNameInput.value;

          if (!userName || userName.trim() === '') {
            formResult.textContent = 'Please enter your name';
            formResult.style.color = 'red';
            return;
          }

          formResult.textContent = 'Processing...';
          formResult.style.color = '#666';

          try {
            const result = await callHandler('submitForm', { userName });
            if (result?.success) {
              formResult.textContent = 'Form submitted successfully.';
              formResult.style.color = 'green';
            } else {
              formResult.textContent = 'Form submission failed.';
              formResult.style.color = 'red';
            }
          } catch (error) {
            formResult.textContent = 'An error occurred while submitting the form.';
            formResult.style.color = 'red';
          }
        };

        submitFormButton?.addEventListener("click", () => {
          void handleFormSubmit();
        });
      }
    `;
  }
}

/**
 * Key Takeaways:
 * 
 * 1. Register message handlers in init() using PluginRegistry.registerHandler()
 * 2. Handlers can be synchronous or asynchronous (use async/await for long operations)
 * 3. Always handle errors in handlers to prevent UI failures
 * 4. Use class properties for temporary state, storage system for persistence
 * 5. Validate user input before processing to prevent security issues
 * 6. Return structured data from handlers to enable UI updates
 * 
 * Common Pitfalls to Avoid:
 * - Don't register handlers in render() - do it in init()
 * - Don't forget error handling in handlers
 * - Don't block the UI with synchronous long-running operations
 * - Don't trust user input - always validate
 * 
 * Next Steps:
 * - See example 03 for data persistence with the storage system
 * - See example 04 for UI extensions (quick actions and side panels)
 * - See example 05 for advanced DOM generation with styling
 */

new InteractivePlugin();

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
 * - Create interactive UI elements (buttons, forms)
 * - Process user input and update the UI
 * - Handle asynchronous operations
 * - Implement proper error handling for user interactions
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Display a form with a text input and submit button
 * 2. Show a counter with increment/decrement buttons
 * 3. Process button clicks and form submissions
 * 4. Update the UI dynamically based on user actions
 * 5. Log all user interactions to the console
 */

import { FDO_SDK, FDOInterface, PluginMetadata, PluginRegistry } from "@anikitenko/fdo-sdk";

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
    icon: "icon.png"
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

      PluginRegistry.registerHandler("incrementCounter", (data: any) => {
        return this.handleIncrement(data);
      });

      PluginRegistry.registerHandler("decrementCounter", (data: any) => {
        return this.handleDecrement(data);
      });

      PluginRegistry.registerHandler("submitForm", async (data: any) => {
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
  private handleIncrement(data: any): any {
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
  private handleDecrement(data: any): any {
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
  private async handleFormSubmit(data: any): Promise<any> {
    try {
      this.log(`Form submitted with data: ${JSON.stringify(data)}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      
      const userName = data.userName || "Guest";
      
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
      const html = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1>${this._metadata.name}</h1>
          <p>${this._metadata.description}</p>
          
          <!-- Counter Example -->
          <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px;">
            <h3>Counter Example</h3>
            <p>Current count: <strong id="counter-display">${this.counter}</strong></p>
            
            <button 
              onclick="window.fdoSDK.sendMessage('incrementCounter', {})"
              style="padding: 10px 20px; margin-right: 10px; cursor: pointer;">
              Increment
            </button>
            
            <button 
              onclick="window.fdoSDK.sendMessage('decrementCounter', {})"
              style="padding: 10px 20px; cursor: pointer;">
              Decrement
            </button>
            
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              Click the buttons to increment or decrement the counter.
              The counter value is maintained in plugin state.
            </p>
          </div>
          
          <!-- Form Example -->
          <div style="margin-top: 20px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
            <h3>Form Example</h3>
            <form onsubmit="event.preventDefault(); handleFormSubmit();">
              <label for="userName" style="display: block; margin-bottom: 5px;">
                Enter your name:
              </label>
              <input 
                type="text" 
                id="userName" 
                name="userName"
                placeholder="Your name"
                style="padding: 8px; width: 300px; margin-bottom: 10px;"
                required
              />
              
              <br>
              
              <button 
                type="submit"
                style="padding: 10px 20px; cursor: pointer; background-color: #007bff; color: white; border: none; border-radius: 3px;">
                Submit
              </button>
            </form>
            
            <div id="form-result" style="margin-top: 10px;"></div>
            
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              Enter your name and submit the form to see async handler processing.
            </p>
          </div>
          
          <!-- JavaScript for form handling -->
          <script>
            
            async function handleFormSubmit() {
              const userName = document.getElementById('userName').value;
              const resultDiv = document.getElementById('form-result');
              
              if (!userName || userName.trim() === '') {
                resultDiv.innerHTML = '<p style="color: red;">Please enter your name</p>';
                return;
              }
              
              resultDiv.innerHTML = '<p style="color: #666;">Processing...</p>';
              
              try {
                const result = await window.fdoSDK.sendMessage('submitForm', { userName });
                
                if (result.success) {
                  resultDiv.innerHTML = \`
                    <p style="color: green;">\${result.message}</p>
                    <p style="font-size: 12px; color: #666;">Processed at: \${result.timestamp}</p>
                  \`;
                } else {
                  resultDiv.innerHTML = \`<p style="color: red;">Error: \${result.error}</p>\`;
                }
              } catch (error) {
                resultDiv.innerHTML = '<p style="color: red;">An error occurred. Check the console.</p>';
                console.error('Form submission error:', error);
              }
            }
          </script>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
            <h3>Key Concepts</h3>
            <ul>
              <li><strong>Message Handlers:</strong> Functions registered in init() that respond to UI events</li>
              <li><strong>Handler Registration:</strong> Use PluginRegistry.registerHandler(name, function)</li>
              <li><strong>Async Patterns:</strong> Handlers can be async for long-running operations</li>
              <li><strong>Error Handling:</strong> Always wrap handler logic in try-catch blocks</li>
              <li><strong>State Management:</strong> Use class properties for temporary state, storage for persistence</li>
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

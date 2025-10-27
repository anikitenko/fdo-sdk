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

import { FDO_SDK, FDOInterface, PluginMetadata, PluginRegistry, DOMText, DOMNested, DOMButton, DOMInput } from "../src";

declare global {
  interface Window {
    fdoSDK: {
      sendMessage: (handler: string, data: any) => Promise<any>;
    };
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
      const domText = new DOMText();
      const domNested = new DOMNested();
      const domButton = new DOMButton();
      const domInput = new DOMInput("userName", {
        style: {
          padding: '8px',
          width: '300px',
          marginBottom: '10px'
        }
      });

      // Create main container
      const mainContent = domNested.createBlockDiv([
        // Header section
        domText.createHText(1, this._metadata.name),
        domText.createPText(this._metadata.description),
        
        // Counter Example
        domNested.createBlockDiv([
          domText.createHText(3, 'Counter Example'),
          domText.createPText([
            'Current count: ',
            domText.createStrongText(this.counter.toString())
          ].join('')),
          
          domButton.createButton('Increment', 
            () => window.fdoSDK.sendMessage('incrementCounter', {}),
            {
              style: {
                padding: '10px 20px',
                marginRight: '10px',
                cursor: 'pointer'
              }
            }
          ),
          
          domButton.createButton('Decrement',
            () => window.fdoSDK.sendMessage('decrementCounter', {}),
            {
              style: {
                padding: '10px 20px',
                cursor: 'pointer'
              }
            }
          ),
          
          domText.createPText(
            'Click the buttons to increment or decrement the counter. The counter value is maintained in plugin state.',
            {
              style: {
                marginTop: '10px',
                fontSize: '12px',
                color: '#666'
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
        
        // Form Example
        domNested.createBlockDiv([
          domText.createHText(3, 'Form Example'),
          domNested.createForm([
            domText.createLabelText('Enter your name:', 'userName', {
              style: {
                display: 'block',
                marginBottom: '5px'
              }
            }),
            
            domInput.createInput('text'),
            
            domButton.createButton('Submit', 
              () => handleFormSubmit(),
              {
                style: {
                  padding: '10px 20px',
                  cursor: 'pointer',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px'
                }
              })
          ], {
            customAttributes: {
              onsubmit: 'event.preventDefault(); handleFormSubmit();'
            }
          }),
          
          domNested.createBlockDiv([], {
            customAttributes: {
              id: 'form-result'
            },
            style: {
              marginTop: '10px'
            }
          }),
          
          domText.createPText(
            'Enter your name and submit the form to see async handler processing.',
            {
              style: {
                marginTop: '10px',
                fontSize: '12px',
                color: '#666'
              }
            }
          )
        ], {
          style: {
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#e8f4f8',
            borderRadius: '5px'
          }
        }),
        
        `<script>
          const plugin = this;
          async function handleFormSubmit() {
            const userName = document.getElementById('userName').value;
            const resultDiv = document.getElementById('form-result');
            
            if (!userName || userName.trim() === '') {
              resultDiv.innerHTML = '${domText.createPText("Please enter your name", { style: { color: 'red' } })}';
              return;
            }
            
            resultDiv.innerHTML = '${domText.createPText("Processing...", { style: { color: '#666' } })}';
            
            try {
              await plugin.handleFormSubmit({ userName });
            } catch (error) {
              resultDiv.innerHTML = '${domText.createPText("An error occurred. Check the console.", { style: { color: 'red' } })}';
              console.error('Form submission error:', error);
            }
          }
        </script>`,
        
        // Key Concepts
        domNested.createBlockDiv([
          domText.createHText(3, 'Key Concepts'),
          domNested.createList([
            domNested.createListItem([
              domText.createStrongText('Message Handlers:'),
              ' Functions registered in init() that respond to UI events'
            ]),
            domNested.createListItem([
              domText.createStrongText('Handler Registration:'),
              ' Use PluginRegistry.registerHandler(name, function)'
            ]),
            domNested.createListItem([
              domText.createStrongText('Async Patterns:'),
              ' Handlers can be async for long-running operations'
            ]),
            domNested.createListItem([
              domText.createStrongText('Error Handling:'),
              ' Always wrap handler logic in try-catch blocks'
            ]),
            domNested.createListItem([
              domText.createStrongText('State Management:'),
              ' Use class properties for temporary state, storage for persistence'
            ])
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

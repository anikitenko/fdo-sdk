/**
 * Example 6: Enhanced Error Handling with Decorators
 * 
 * This example demonstrates how to use the @handleError decorator to implement
 * consistent error handling across your plugin methods with minimal boilerplate.
 * 
 * Compatible with SDK v1.x
 * 
 * Learning Objectives:
 * - Use the @handleError decorator for automatic error handling
 * - Configure custom error messages and UI
 * - Apply decorators to different method types (init, render, handlers)
 * - Understand error result structure and handling
 * 
 * Expected Output:
 * When this plugin runs in the FDO application, it will:
 * 1. Demonstrate error handling in init()
 * 2. Show custom error UIs for render() failures
 * 3. Handle errors in message handlers with standard responses
 * 4. Log all errors automatically to console
 */

import { FDO_SDK, FDOInterface, PluginMetadata, DOMText, DOMNested, DOMButton, handleError, PluginRegistry } from "@anikitenko/fdo-sdk";

/**
 * ErrorHandlingPlugin demonstrates the @handleError decorator usage.
 */
export default class ErrorHandlingPlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Error Handling Example",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Demonstrates enhanced error handling with @handleError decorator",
    icon: "icon.png"
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  /**
   * Initialize with error handling.
   * The decorator will automatically:
   * 1. Log any errors
   * 2. Return standardized error response
   */
  @handleError({
    errorMessage: "Plugin initialization failed"
  })
  init(): void {
    this.log("ErrorHandlingPlugin initialized!");

    PluginRegistry.registerHandler("simulateSuccess", (data: any) => {
      return this.handleSuccess(data);
    });

    PluginRegistry.registerHandler("simulateError", (data: any) => {
      return this.handleError(data);
    });

    // Simulate an error condition
    if (Math.random() < 0.1) {
      throw new Error("Random initialization error");
    }
  }

  /**
   * Handler that succeeds.
   */
  @handleError()
  private handleSuccess(data: any): any {
    return {
      message: "Operation completed successfully",
      data
    };
  }

  /**
   * Handler that throws an error.
   */
  @handleError({
    errorMessage: "Custom error handler message"
  })
  private handleError(data: any): any {
    throw new Error("Simulated handler error");
  }

  /**
   * Render with custom error UI.
   */
  @handleError({
    returnErrorUI: true,
    errorUIRenderer: (error: Error) => {
      const domText = new DOMText();
      const domNested = new DOMNested();
      const domButton = new DOMButton();

      return domNested.createBlockDiv([
        domText.createHText(2, "⚠️ Plugin Error"),
        domText.createPText(error.message),
        domButton.createButton("Try Again", () => window.location.reload())
      ], {
        style: {
          padding: "20px",
          border: "2px solid #dc3545",
          borderRadius: "8px",
          backgroundColor: "#fff5f5"
        }
      });
    }
  })
  render(): string {
    const domText = new DOMText();
    const domNested = new DOMNested();
    const domButton = new DOMButton();

    // Main container
    return domNested.createBlockDiv([
      // Header
      domText.createHText(1, this._metadata.name),
      domText.createPText(this._metadata.description),

      // Demo buttons
      domNested.createBlockDiv([
        domButton.createButton("Success Handler", {
          onClick: () => window.fdoSDK.sendMessage('simulateSuccess', { test: true })
        }),
        " ",
        domButton.createButton("Error Handler", {
          onClick: () => window.fdoSDK.sendMessage('simulateError', { test: true })
        })
      ], {
        style: {
          marginTop: "20px"
        }
      }),

      // Documentation
      domNested.createBlockDiv([
        domText.createHText(3, "How to Use @handleError"),
        domText.createPText("The @handleError decorator provides:"),
        domNested.createList([
          domNested.createListItem(["Automatic error logging"]),
          domNested.createListItem(["Standardized error responses"]),
          domNested.createListItem(["Custom error messages"]),
          domNested.createListItem(["Error UI generation for render()"])
        ])
      ], {
        style: {
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "5px"
        }
      })
    ], {
      style: {
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }
    });
  }
}

/**
 * Key Takeaways:
 * 
 * 1. Use @handleError decorator to reduce error handling boilerplate
 * 2. Configure custom error messages and UI rendering
 * 3. Get standardized error responses from handlers
 * 4. Automatic error logging through FDO_SDK
 * 
 * Common Pitfalls to Avoid:
 * - Don't forget to enable decorators in tsconfig.json
 * - Remember that render() error UI is optional
 * - Always provide meaningful error messages
 */
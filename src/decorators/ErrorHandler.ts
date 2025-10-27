import { FDO_SDK } from "../index";
import { NotificationManager } from "../utils/NotificationManager";

/**
 * Interface for error handler result
 */
export interface ErrorResult<T = any> {
  success: boolean;
  error?: string;
  result?: T;
  notificationId?: string;
}

/**
 * Configuration for error handling decorator
 */
export interface ErrorHandlerConfig {
  /** Custom error message */
  errorMessage?: string;
  /** Whether to return a default error UI for render methods */
  returnErrorUI?: boolean;
  /** Custom error UI renderer */
  errorUIRenderer?: (error: Error) => string;
  /** Whether to show notifications in the VS Code UI */
  showNotifications?: boolean;
  /** Additional context to include in error notifications */
  context?: Record<string, any>;
}

/**
 * Creates method decorator for error handling in FDO_SDK plugin methods
 * 
 * @param config Optional configuration for error handling
 */
export function handleError(config: ErrorHandlerConfig = {}) {
  return function decorateMethod(
    target: Object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>
  ): TypedPropertyDescriptor<any> {
    // Store the original method
    const originalMethod = descriptor.value;
    
    // Create new method wrapper
    descriptor.value = async function (this: FDO_SDK, ...args: any[]) {
      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);
        
        // For render methods, return as is
        if (propertyKey === "render") {
          return result;
        }
        
        // For other methods, wrap in success response
        return {
          success: true,
          result
        };
        
      } catch (error) {
        // Get error details
        const errorObj = error as Error;
        const errorMessage = config.errorMessage || errorObj.message;
        
        // Log error using SDK's error method
        this.error(errorObj);
        
        // Add to notification manager
        const notification = NotificationManager.getInstance().addNotification(
          errorMessage,
          'error',
          {
            stack: errorObj.stack,
            context: config.context,
            method: propertyKey.toString(),
            args: args
          }
        );

        // Show VS Code notification if configured
        if (config.showNotifications !== false) {
          // Using the existing error method which integrates with VS Code
          this.error(new Error(errorMessage));
        }
        
        // For render method, return error UI
        if (propertyKey === "render") {
          if (config.errorUIRenderer) {
            return config.errorUIRenderer(errorObj);
          }
          
          if (config.returnErrorUI !== false) {
            return `
              <div style="padding: 20px; color: red;">
                <h2>Error rendering plugin</h2>
                <p>${errorMessage}</p>
                ${config.context ? `<pre>${JSON.stringify(config.context, null, 2)}</pre>` : ''}
              </div>
            `;
          }
          
          throw error; // Re-throw if no error UI handling configured
        }
        
        // For other methods, return error result with notification ID
        return {
          success: false,
          error: errorMessage,
          notificationId: notification.timestamp.toISOString()
        };
      }
    };
    
    return descriptor;
  };
}
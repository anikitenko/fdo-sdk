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

    const buildSuccessResult = (result: any) => {
      if (propertyKey === "render") {
        return result;
      }

      return {
        success: true,
        result
      };
    };

    const buildErrorResult = function (this: FDO_SDK, error: unknown, args: any[]) {
      const errorObj = error as Error;
      const errorMessage = config.errorMessage || errorObj.message;

      this.error(errorObj);

      const notification = NotificationManager.getInstance().addNotification(
        errorMessage,
        "error",
        {
          stack: errorObj.stack,
          context: config.context,
          method: propertyKey.toString(),
          args: args
        }
      );

      if (config.showNotifications !== false) {
        this.error(new Error(errorMessage));
      }

      if (propertyKey === "render") {
        if (config.errorUIRenderer) {
          try {
            return config.errorUIRenderer(errorObj);
          } catch (rendererError) {
            this.error(rendererError as Error);
          }
        }

        if (config.returnErrorUI !== false) {
          return `
              <div style="padding: 20px; color: red;">
                <h2>Error rendering plugin</h2>
                <p>${errorMessage}</p>
                ${config.context ? `<pre>${JSON.stringify(config.context, null, 2)}</pre>` : ""}
              </div>
            `;
        }

        throw error;
      }

      return {
        success: false,
        error: errorMessage,
        notificationId: notification.timestamp.toISOString()
      };
    };

    // Create new method wrapper while preserving sync behavior for sync methods.
    descriptor.value = function (this: FDO_SDK, ...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);

        if (result && typeof result.then === "function") {
          return result
            .then((resolvedResult: any) => buildSuccessResult(resolvedResult))
            .catch((error: unknown) => buildErrorResult.call(this, error, args));
        }

        return buildSuccessResult(result);
      } catch (error) {
        return buildErrorResult.call(this, error, args);
      }
    };
    
    return descriptor;
  };
}

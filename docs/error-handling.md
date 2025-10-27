# Enhanced Error Handling System

The enhanced error handling system provides a robust way to handle and track errors in FDO SDK plugins. It includes features for error notification management, persistence, and customizable error UI rendering.

## Components

### CircularBuffer

A fixed-size circular buffer implementation for efficient notification storage:

```typescript
import { CircularBuffer } from './utils/CircularBuffer';

const buffer = new CircularBuffer<string>(100); // Stores last 100 items
buffer.push("new item"); // Adds item, removing oldest if full
const items = buffer.toArray(); // Get all items in order
```

### NotificationManager

A singleton manager for handling error notifications:

```typescript
import { NotificationManager } from './utils/NotificationManager';

const manager = NotificationManager.getInstance();
manager.addNotification("An error occurred", "error", { details: "..." });
const errors = manager.getNotificationsByType("error");
```

### Error Handler Decorator

A method decorator for automatic error handling:

```typescript
import { handleError } from './decorators/ErrorHandler';

class MyPlugin {
    // Basic usage
    @handleError()
    async doSomething() {
        // Method implementation
    }

    // With custom error UI
    @handleError({
        errorMessage: "Custom error message",
        returnErrorUI: true,
        errorUIRenderer: (error) => `<custom-error>${error.message}</custom-error>`,
        showNotifications: true,
        context: { pluginId: "my-plugin" }
    })
    render() {
        // Render implementation
    }
}
```

## Features

1. **Automatic Error Catching**: The `@handleError` decorator automatically catches and processes errors.
2. **Notification Management**: Errors are stored in a circular buffer to prevent memory leaks.
3. **VS Code Integration**: Errors can be displayed in VS Code's notification system.
4. **Custom Error UI**: Support for custom error UI rendering in plugin views.
5. **Context Support**: Additional context can be attached to error notifications.
6. **Error History**: Access to historical error information through NotificationManager.

## Configuration Options

The `@handleError` decorator accepts these configuration options:

- `errorMessage`: Custom error message to display
- `returnErrorUI`: Whether to return default error UI for render methods
- `errorUIRenderer`: Custom function for rendering error UI
- `showNotifications`: Whether to show VS Code notifications
- `context`: Additional context to include with errors

## Error Result Interface

Methods decorated with `@handleError` return results in this format:

```typescript
interface ErrorResult<T> {
    success: boolean;
    error?: string;
    result?: T;
    notificationId?: string;
}
```

## Best Practices

1. Always provide meaningful error messages
2. Use context to include relevant debugging information
3. Implement custom error UI for better user experience
4. Monitor error history for debugging
5. Clear old notifications when appropriate

## Example Usage

```typescript
class MyPlugin {
    @handleError({
        errorMessage: "Failed to process data",
        context: { source: "data-processor" }
    })
    async processData(data: any) {
        // Implementation
    }

    @handleError({
        returnErrorUI: true,
        errorUIRenderer: (error) => `
            <div class="error-container">
                <h3>Error Processing Data</h3>
                <p>${error.message}</p>
                ${error.details ? `<pre>${JSON.stringify(error.details, null, 2)}</pre>` : ''}
            </div>
        `
    })
    render() {
        // Render implementation
    }
}
```
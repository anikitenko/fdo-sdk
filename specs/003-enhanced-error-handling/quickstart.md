# Enhanced Error Handling Quickstart

## Basic Usage

Add error handling to any plugin method with the `@handleError` decorator:

```typescript
import { handleError } from '@anikitenko/fdo-sdk';

class MyPlugin extends BasePlugin {
  @handleError()
  async getData(): Promise<Result<Data>> {
    // Your code here
  }
}
```

## Configuration Options

### Basic Error Message

```typescript
@handleError({
  errorMessage: "Failed to fetch user data"
})
async getUser(id: string): Promise<Result<User>> {
  // Your code here
}
```

### Custom Error UI

```typescript
@handleError({
  returnErrorUI: true,
  errorUIRenderer: (error) => ({
    type: 'error-card',
    message: error.message,
    retry: true
  })
})
render(): HTMLElement {
  // Your rendering code
}
```

### Notification Configuration

```typescript
@handleError({
  showNotification: true,
  notificationConfig: {
    category: 'data-operations',
    level: 'error',
    rateLimit: {
      maxPerMinute: 5,
      groupSimilar: true
    }
  }
})
async saveData(data: any): Promise<Result<void>> {
  // Your code here
}
```

## Category Registration

Register notification categories in your plugin's init method:

```typescript
class MyPlugin extends BasePlugin {
  async init() {
    await this.registerNotificationCategories([
      'data-operations',
      'ui-events',
      'network'
    ]);
  }
}
```

## Error Recovery Actions

Add retry or recovery actions to your error handlers:

```typescript
@handleError({
  notificationConfig: {
    category: 'network',
    actions: [{
      label: 'Retry',
      handler: 'retryOperation'
    }]
  }
})
async fetchData(): Promise<Result<Data>> {
  // Your code here
}

// Handler method
async retryOperation(params: any): Promise<void> {
  await this.fetchData();
}
```

## Best Practices

1. **Category Management**
   - Limit to 10 categories per plugin
   - Use semantic grouping
   - Keep categories consistent

2. **Memory Usage**
   - Monitor notification buffer size
   - Clean up dismissed notifications
   - Respect 50MB per plugin limit

3. **Error Messages**
   - Use clear, actionable messages
   - Include recovery steps
   - Keep under 200 characters

4. **Stack Traces**
   - Limited to 20 frames
   - Include relevant context
   - Filter sensitive information

## Debugging

Enable debug mode for detailed error information:

```typescript
@handleError({
  debug: true,
  logContext: true
})
```

## Type Safety

The decorator preserves type information:

```typescript
// Result type is preserved
@handleError()
async getData(): Promise<Result<Data>> {
  return { data: await fetchData() };
}

// Type checking works
const result = await plugin.getData();
if (result.success) {
  const data: Data = result.result;
}
```
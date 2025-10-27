# Data Models for Enhanced Error Handling

## Core Entities

### ErrorResult<T>
```typescript
interface ErrorResult<T> {
  success: boolean;
  error?: string;
  result?: T;
}
```

**Validation Rules:**
- `success` must be boolean
- If `success` is false, `error` must be present
- If `success` is true, `result` must be present (if T is not void)

### ErrorHandlerConfig
```typescript
interface ErrorHandlerConfig {
  errorMessage?: string;
  returnErrorUI?: boolean;
  errorUIRenderer?: (error: Error) => any;
  showNotification?: boolean;
  notificationConfig?: NotificationConfig;
  rateLimitMs?: number;
}
```

**Validation Rules:**
- `rateLimitMs` must be > 0 if provided
- `errorUIRenderer` must return a valid DOM element or string
- Maximum one active errorUIRenderer per plugin
- `notificationConfig` must follow NotificationConfig constraints

### ErrorNotification
```typescript
interface ErrorNotification {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  details: {
    stack: string[];
    context: Record<string, any>;
  };
  source: {
    pluginId: string;
    methodName: string;
  };
  actions?: NotificationAction[];
  category: string;
}
```

**Validation Rules:**
- `id` must be unique UUID v4
- `timestamp` must be valid Date
- `stack` limited to 20 frames
- `category` must be one of plugin's registered categories (max 10)
- Notification retention: 7 days maximum
- `message` max length: 200 characters

### NotificationConfig
```typescript
interface NotificationConfig {
  level?: 'error' | 'warning' | 'info';
  category: string;
  groupId?: string;
  groupTitle?: string;
  rateLimit?: {
    maxPerMinute: number;
    groupSimilar: boolean;
  };
}
```

**Validation Rules:**
- `maxPerMinute` must be between 1 and 60
- `category` must be registered before use
- Maximum 10 categories per plugin

### NotificationAction
```typescript
interface NotificationAction {
  label: string;
  handler: string;
  params?: Record<string, any>;
}
```

**Validation Rules:**
- `label` max length: 50 characters
- `handler` must be a valid method name in plugin
- Maximum 3 actions per notification

## State Management

### Notification Lifecycle
1. Created → Active → Dismissed/Expired
   - Created: When error occurs
   - Active: While in notification panel
   - Dismissed: User action
   - Expired: After 7 days

### Error Handler States
1. Initial → Configured → Active
   - Initial: After decorator application
   - Configured: After plugin initialization
   - Active: During method execution

## Relationships

### Plugin ↔ ErrorHandler
- One plugin can have multiple error handlers
- Each error handler belongs to one plugin
- Plugin manages error handler configuration

### ErrorHandler ↔ Notification
- One error handler can generate multiple notifications
- Each notification is created by one error handler
- Notifications are grouped by category

### Notification ↔ Action
- One notification can have multiple actions (0-3)
- Each action belongs to one notification
- Actions are bound to plugin methods

## Storage Constraints

### Memory Limits
- Maximum 50MB per plugin
- Includes:
  - Error handler metadata
  - Active notifications
  - Stack traces
  - Category data

### Persistence
- Notifications: In-memory only
- Configuration: Plugin metadata
- Error logs: Logger system
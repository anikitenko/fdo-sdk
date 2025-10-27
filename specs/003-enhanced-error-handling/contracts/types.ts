// TypeScript interfaces for Enhanced Error Handling

/**
 * Generic error result wrapper
 */
export interface ErrorResult<T> {
  success: boolean;
  error?: string;
  result?: T;
}

/**
 * Configuration for error handler decorator
 */
export interface ErrorHandlerConfig {
  errorMessage?: string;
  returnErrorUI?: boolean;
  errorUIRenderer?: (error: Error) => any;
  showNotification?: boolean;
  notificationConfig?: NotificationConfig;
  rateLimitMs?: number;
}

/**
 * Structure for error notifications
 */
export interface ErrorNotification {
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

/**
 * Configuration for notifications
 */
export interface NotificationConfig {
  level?: 'error' | 'warning' | 'info';
  category: string;
  groupId?: string;
  groupTitle?: string;
  rateLimit?: {
    maxPerMinute: number;
    groupSimilar: boolean;
  };
}

/**
 * Action definition for notifications
 */
export interface NotificationAction {
  label: string;
  handler: string;
  params?: Record<string, any>;
}

/**
 * Error handler decorator factory
 */
export declare function handleError(config?: ErrorHandlerConfig): MethodDecorator;

/**
 * Plugin category registration
 */
export declare function registerNotificationCategories(categories: string[]): Promise<void>;

/**
 * Notification management methods
 */
export interface NotificationManager {
  show(notification: ErrorNotification): void;
  dismiss(id: string): void;
  clear(): void;
  getActive(): ErrorNotification[];
}
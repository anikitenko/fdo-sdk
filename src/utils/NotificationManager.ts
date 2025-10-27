import { CircularBuffer } from './CircularBuffer';

export interface Notification {
    message: string;
    type: 'error' | 'warning' | 'info';
    timestamp: Date;
    details?: any;
}

/**
 * Manages notifications using a circular buffer to prevent memory leaks
 * while maintaining a history of recent notifications.
 */
export class NotificationManager {
    private static instance: NotificationManager;
    private buffer: CircularBuffer<Notification>;

    private constructor(capacity: number = 100) {
        this.buffer = new CircularBuffer<Notification>(capacity);
    }

    /**
     * Gets the singleton instance of NotificationManager
     */
    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Adds a new notification to the buffer
     */
    addNotification(
        message: string,
        type: 'error' | 'warning' | 'info' = 'info',
        details?: any
    ): Notification {
        const notification: Notification = {
            message,
            type,
            timestamp: new Date(),
            details
        };
        this.buffer.push(notification);
        return notification;
    }

    /**
     * Gets all notifications in chronological order
     */
    getNotifications(): Notification[] {
        return this.buffer.toArray();
    }

    /**
     * Gets the most recent notification
     */
    getLatestNotification(): Notification | undefined {
        const notifications = this.buffer.toArray();
        return notifications[notifications.length - 1];
    }

    /**
     * Clears all notifications
     */
    clearNotifications(): void {
        this.buffer.clear();
    }

    /**
     * Gets notifications filtered by type
     */
    getNotificationsByType(type: 'error' | 'warning' | 'info'): Notification[] {
        return this.buffer.toArray().filter(n => n.type === type);
    }

    /**
     * Gets the total count of notifications
     */
    get count(): number {
        return this.buffer.length;
    }

    /**
     * Gets the maximum number of notifications that can be stored
     */
    get capacity(): number {
        return this.buffer.maxSize;
    }
}
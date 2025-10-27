import { NotificationManager } from '../src/utils/NotificationManager';

describe('NotificationManager', () => {
    let manager: NotificationManager;

    beforeEach(() => {
        // Reset the singleton instance before each test
        (NotificationManager as any).instance = undefined;
        manager = NotificationManager.getInstance();
    });

    it('should maintain singleton instance', () => {
        const manager2 = NotificationManager.getInstance();
        expect(manager2).toBe(manager);
    });

    it('should add and retrieve notifications', () => {
        const notification = manager.addNotification('Test message');
        expect(notification.message).toBe('Test message');
        expect(notification.type).toBe('info');
        expect(notification.timestamp).toBeInstanceOf(Date);

        const notifications = manager.getNotifications();
        expect(notifications).toHaveLength(1);
        expect(notifications[0]).toBe(notification);
    });

    it('should handle different notification types', () => {
        manager.addNotification('Info message', 'info');
        manager.addNotification('Warning message', 'warning');
        manager.addNotification('Error message', 'error');

        expect(manager.getNotificationsByType('info')).toHaveLength(1);
        expect(manager.getNotificationsByType('warning')).toHaveLength(1);
        expect(manager.getNotificationsByType('error')).toHaveLength(1);
    });

    it('should maintain order and handle capacity', () => {
        // Create manager with small capacity for testing
        (NotificationManager as any).instance = new (NotificationManager as any)(2);
        manager = NotificationManager.getInstance();

        manager.addNotification('First');
        manager.addNotification('Second');
        manager.addNotification('Third');

        const notifications = manager.getNotifications();
        expect(notifications).toHaveLength(2);
        expect(notifications[0].message).toBe('Second');
        expect(notifications[1].message).toBe('Third');
    });

    it('should get latest notification', () => {
        manager.addNotification('First');
        manager.addNotification('Second');

        const latest = manager.getLatestNotification();
        expect(latest?.message).toBe('Second');
    });

    it('should clear notifications', () => {
        manager.addNotification('Test');
        expect(manager.count).toBe(1);

        manager.clearNotifications();
        expect(manager.count).toBe(0);
        expect(manager.getNotifications()).toHaveLength(0);
    });

    it('should store additional details', () => {
        const details = { code: 500, stack: 'test stack' };
        const notification = manager.addNotification('Error', 'error', details);
        expect(notification.details).toBe(details);
    });

    it('should expose count and capacity', () => {
        expect(manager.capacity).toBe(100); // Default capacity
        expect(manager.count).toBe(0);

        manager.addNotification('Test');
        expect(manager.count).toBe(1);
    });
});
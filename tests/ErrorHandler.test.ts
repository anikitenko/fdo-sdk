import { handleError } from '../src/decorators/ErrorHandler';
import { NotificationManager } from '../src/utils/NotificationManager';
import { FDO_SDK } from '../src';

describe('ErrorHandler Decorator', () => {
    let mockError: jest.Mock;
    let mockSDK: { error: jest.Mock };

    beforeEach(() => {
        mockError = jest.fn();
        mockSDK = { error: mockError };
        (NotificationManager as any).instance = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should handle successful method execution', async () => {
        const descriptor: PropertyDescriptor = {
            value: async function() {
                return 'success';
            }
        };

        const decoratedDescriptor = handleError()(
            mockSDK,
            'testMethod',
            descriptor
        );

        const result = await decoratedDescriptor.value.call(mockSDK);

        expect(result).toEqual({
            success: true,
            result: 'success'
        });
        expect(mockError).not.toHaveBeenCalled();
        expect(NotificationManager.getInstance().count).toBe(0);
    });

    it('should handle errors and add notifications', async () => {
        const testError = new Error('Test error');
        const descriptor: PropertyDescriptor = {
            value: async function() {
                throw testError;
            }
        };

        const decoratedDescriptor = handleError({ showNotifications: true })(
            mockSDK,
            'testMethod',
            descriptor
        );

        const result = await decoratedDescriptor.value.call(mockSDK);

        expect(result).toEqual({
            success: false,
            error: 'Test error',
            notificationId: expect.any(String)
        });
        
        expect(mockError).toHaveBeenCalledTimes(2); // Once for logging, once for notification
        expect(NotificationManager.getInstance().count).toBe(1);
        
        const notification = NotificationManager.getInstance().getLatestNotification();
        expect(notification).toBeDefined();
        expect(notification?.message).toBe('Test error');
        expect(notification?.type).toBe('error');
    });

    it('should handle render method errors with custom UI', async () => {
        const testError = new Error('Render error');
        const customUI = (error: Error) => `<custom>${error.message}</custom>`;
        
        const descriptor: PropertyDescriptor = {
            value: function() {
                throw testError;
            }
        };

        const decoratedDescriptor = handleError({ errorUIRenderer: customUI })(
            mockSDK,
            'render',
            descriptor
        );

        const result = await decoratedDescriptor.value.call(mockSDK);

        expect(result).toBe('<custom>Render error</custom>');
        expect(mockError).toHaveBeenCalledWith(testError);
        expect(NotificationManager.getInstance().count).toBe(1);
    });

    it('should include context in error details', async () => {
        const context = { userId: '123', action: 'test' };
        const descriptor: PropertyDescriptor = {
            value: async function() {
                throw new Error('Context error');
            }
        };

        const decoratedDescriptor = handleError({ context })(
            mockSDK,
            'testMethod',
            descriptor
        );

        await decoratedDescriptor.value.call(mockSDK);

        const notification = NotificationManager.getInstance().getLatestNotification();
        expect(notification?.details?.context).toEqual(context);
    });

    it('should return default error UI for render methods', async () => {
        const descriptor: PropertyDescriptor = {
            value: function() {
                throw new Error('UI error');
            }
        };

        const decoratedDescriptor = handleError()(
            mockSDK,
            'render',
            descriptor
        );

        const result = await decoratedDescriptor.value.call(mockSDK);

        expect(result).toContain('Error rendering plugin');
        expect(result).toContain('UI error');
        expect(NotificationManager.getInstance().count).toBe(1);
    });
});
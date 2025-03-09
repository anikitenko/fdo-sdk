import { QuickActionMixin } from "../src/QuickActionMixin";
import { FDO_SDK, QuickAction } from "../src";

class TestQuickActionPlugin extends QuickActionMixin(FDO_SDK) {
    defineQuickActions(): QuickAction[] {
        return [{ name: "Run Task", message_type: "RUN_TASK" }];
    }
}

describe("QuickActionMixin", () => {
    beforeEach(() => {
        // Mock process.parentPort to prevent errors
        (global as any).process.parentPort = {
            on: jest.fn(), // Mock the 'on' function
            postMessage: jest.fn(), // Mock postMessage (if needed)
        };
    });

    afterEach(() => {
        delete (global as any).process.parentPort;
    });

    test("should return default empty quick actions", () => {
        class EmptyPlugin extends QuickActionMixin(FDO_SDK) {}
        const plugin = new EmptyPlugin();
        expect(plugin.defineQuickActions()).toEqual([]);
    });

    test("should return defined quick actions", () => {
        const plugin = new TestQuickActionPlugin();
        expect(plugin.defineQuickActions()).toEqual([
            { name: "Run Task", message_type: "RUN_TASK" },
        ]);
    });
});

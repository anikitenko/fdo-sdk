import { SidePanelMixin } from "../src/SidePanelMixin";
import {SidePanelConfig} from "../src/types";
import {FDO_SDK} from "../src";

class TestSidePanelPlugin extends SidePanelMixin(FDO_SDK) {
    defineSidePanel(): SidePanelConfig {
        return { icon: "settings", label: "Settings Panel", submenu_list: [] };
    }
}

describe("SidePanelMixin", () => {
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

    test("should return default empty side panel config", () => {
        class EmptyPlugin extends SidePanelMixin(FDO_SDK) {}
        const plugin = new EmptyPlugin();
        expect(plugin.defineSidePanel()).toEqual({ icon: "", label: "", submenu_list: [] });
    });

    test("should return defined side panel config", () => {
        const plugin = new TestSidePanelPlugin();
        expect(plugin.defineSidePanel()).toEqual({
            icon: "settings",
            label: "Settings Panel",
            submenu_list: [],
        });
    });
});

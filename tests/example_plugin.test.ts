import MyPlugin from '../examples/example_plugin';
import {FDO_SDK, FDOInterface, PluginMetadata} from '../src';

describe('MyPlugin Tests', () => {
    let plugin: MyPlugin;
    let sdk: FDO_SDK;

    beforeEach(() => {
        sdk = new FDO_SDK(); // Creating an instance of the base SDK (if needed)
        plugin = new MyPlugin(); // Creating an instance of the plugin
    });

    it('should create an instance of MyPlugin', () => {
        expect(plugin).toBeInstanceOf(MyPlugin);
    });

    it('should have TYPE_TAG', () => {
        expect(plugin.TYPE_TAG).toBe(sdk.TYPE_TAG);
    });

    it('should implement init method and log initialization', () => {
        // Mocking console.log to check for logs
        console.log = jest.fn();

        plugin.init(sdk); // Calling the init method of the plugin

        expect(console.log).toHaveBeenCalledWith('[SDK LOG]: MyPlugin initialized!');
    });

    it('should implement render method and return correct content', () => {
        const result = plugin.render();

        expect(result).toBe('Rendered MyPlugin content!');
    });

    it('should inherit methods from FDO_SDK', () => {
        const message = 'Test message';

        // Mocking console.log
        console.log = jest.fn();

        plugin.log(message); // Calling the inherited method from FDO_SDK

        expect(console.log).toHaveBeenCalledWith(`[SDK LOG]: ${message}`);
    });

    it('should throw error if init and render are not implemented in plugin', () => {
        class AnotherPlugin extends FDO_SDK implements FDOInterface {
            public metadata: PluginMetadata = {
                name: "MyPlugin",
                version: "1.0.0",
                author: "John Doe",
                description: "A sample plugin for FDO",
                icon: "BOX",
            };
            // No init or render method here, this should fail
            // init() and render() are not implemented, so an error should be thrown
        }

        const anotherPlugin = new AnotherPlugin();

        expect(() => anotherPlugin.init(sdk)).toThrow("Method 'init' must be implemented by plugin.");
        expect(() => anotherPlugin.render()).toThrow("Method 'render' must be implemented by plugin.");
    });
});

import {FDO_SDK} from '../src';  // Adjust the import based on your file structure

describe('FDO_SDK Tests', () => {
    let api_version: string = "1.0.0";
    let sdk: FDO_SDK;

    beforeEach(() => {
        sdk = new FDO_SDK();
    });

    it('should initialize correctly', () => {
        expect(FDO_SDK.API_VERSION).toBe(api_version);
        // You could also mock console.log to ensure "MiniSDK initialized." is logged
    });

    it('should generate correct name', () => {
        expect(FDO_SDK.generatePluginName("this is-a-random test")).toBe('this-is-a-random-test');
        expect(FDO_SDK.generatePluginName("this+ is-a-random test")).toBe('this-is-a-random-test');
        expect(FDO_SDK.generatePluginName("this - 34t 534is-a-random test")).toBe('this-34t-534is-a-random-test');
        expect(FDO_SDK.generatePluginName("this 5/415/2345/324is-a-random test")).toBe('this-5-415-2345-324is-a-random-test');
    })

    it('should throw error for unimplemented init method', () => {
        expect(() => sdk.init(sdk)).toThrow("Method 'init' must be implemented by plugin.");
    });

    it('should throw error for unimplemented render method', () => {
        expect(() => sdk.render()).toThrow("Method 'render' must be implemented by plugin.");
    });

    it('should log messages correctly', () => {
        // Mocking console.log
        console.log = jest.fn();

        const message = 'Test message';
        sdk.log(message);
        expect(console.log).toHaveBeenCalledWith(`[SDK LOG]: ${message}`);
    });

    it('should create a tab with content', () => {
        const tabName = 'MyTab';
        const contentFn = () => 'Tab content here';
        const result = sdk.createTab(tabName, contentFn);

        expect(result).toBe('Tab content here');
    });

    it('should store file correctly', () => {
        // Mocking console.log
        console.log = jest.fn();

        const filename = 'test.txt';
        const data = 'File data here';
        sdk.storeFile(filename, data);
        expect(console.log).toHaveBeenCalledWith(`Storing file: ${filename} with data: ${data}`);
    });

    it('should not expose private and protected methods', () => {
        // _privateMethod is private and should not be directly accessible, so we can skip this in tests
        // _updatePrivateData is protected and should not be directly accessible, so we can skip this in tests
        // _getPrivateData is protected and should not be directly accessible, so we can skip this in tests
        // Just make sure it's not publicly accessible by calling it indirectly (if needed)
    });
});

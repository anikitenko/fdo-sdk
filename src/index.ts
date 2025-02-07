export default class FDO_SDK {
    public api: string = "1.0";
    private _sdkPrivateData: Record<string, any> = {};  // Private data storage

    constructor() {
        console.log("MiniSDK initialized.");
    }

    // 1. Must-Inherited Methods (abstract-like methods)
    // These should be implemented by the plugin
    public init(sdk: FDO_SDK): void {
        throw new Error("Method 'init' must be implemented by plugin.");
    }

    public render(): string {
        throw new Error("Method 'render' must be implemented by plugin.");
    }

    // 2. Exposed Methods (accessible to plugins)
    public log(message: string): void {
        console.log(`[SDK LOG]: ${message}`);
    }

    public createTab(name: string, contentFn: () => string): string {
        console.log(`[SDK]: Creating Tab: ${name}`);
        return contentFn();
    }

    public storeFile(filename: string, data: string): void {
        console.log(`Storing file: ${filename} with data: ${data}`);
    }

    // 3. Internal/Private Methods (not exposed to plugins)
    private _privateMethod(): void {
        console.log("This is a private method!");
    }

    // Can be used internally or in subclasses (plugins)
    protected _updatePrivateData(key: string, value: any): void {
        this._sdkPrivateData[key] = value;
    }

    // Method to demonstrate private data usage
    protected _getPrivateData(): Record<string, any> {
        return this._sdkPrivateData;
    }
}

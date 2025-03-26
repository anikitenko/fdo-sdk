import {FDO_SDK, PluginMetadata, FDOInterface} from '../src';

class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "MyPlugin",
        version: "1.0.0",
        author: "Oleksandr Nykytenko",
        description: "A sample plugin for FDO",
        icon: "COG",
    };

    constructor() {
        super()
    }

    public get metadata(): PluginMetadata {
        return this._metadata
    }

    public init(): void {
        this.log("MyPlugin initialized!")
    }

    public render(): string {
        return "Rendered MyPlugin content!"
    }
}

export default MyPlugin

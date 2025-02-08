export const EXAMPLE: string = `var MyPlugin = class {
  _metadata = {
    name: "MyPlugin",
    version: "1.0.0",
    author: "John Doe",
    description: "A sample plugin for FDO",
    icon: "COG"
  };
  constructor() {
  }
  get metadata() {
    return this._metadata;
  }
  init(sdk) {
    sdk.log("MyPlugin initialized!");
  }
  render() {
    return "Rendered MyPlugin content!";
  }
};
var example_plugin_default = MyPlugin;
export {
  example_plugin_default as default
};
`
